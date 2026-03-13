'use client'

import { useState, useEffect, useLayoutEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import QuickSend from './components/QuickSend'
import ScheduleMessage from './components/ScheduleMessage'
import ScheduledList from './components/ScheduledList'
import BellButton from './components/BellButton'

type Tab = 'quick' | 'schedule' | 'scheduled'

type DeepLink = { phone: string; message: string; countryCode: string }

function AppContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Initial values from URL params (app launched from notification while closed)
  const initialPhone       = searchParams.get('phone')       || ''
  const initialMessage     = searchParams.get('message')     || ''
  const initialCountryCode = searchParams.get('countryCode') || '52'
  const fromNotif          = searchParams.get('notif') === '1'
  const tabFromUrl         = (searchParams.get('tab') as Tab) || 'quick'

  const [activeTab, setActiveTab]   = useState<Tab>(initialPhone ? 'quick' : tabFromUrl)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sessionId, setSessionId]   = useState('')
  const [debugLogs, setDebugLogs]   = useState<string[]>([])
  const debugMode = searchParams.get('debug') === '1'

  // Deep-link state — starts from URL params, updated via server polling
  const [deepLink, setDeepLink] = useState<DeepLink>({
    phone:       initialPhone,
    message:     initialMessage,
    countryCode: initialCountryCode,
  })

  // WhatsApp overlay — shown when app is opened from a notification (fallback if auto-redirect fails)
  const [waOverlay, setWaOverlay] = useState<DeepLink | null>(
    fromNotif && initialPhone ? { phone: initialPhone, message: initialMessage, countryCode: initialCountryCode } : null
  )

  // Auto-redirect to WhatsApp when app is cold-started from a notification.
  // https://wa.me/ is a universal link — iOS opens WhatsApp directly, no user gesture needed.
  useLayoutEffect(() => {
    if (!fromNotif || !initialPhone) return
    const clean = initialPhone.replace(/\D/g, '')
    const full  = `${initialCountryCode}${clean}`
    window.location.href = `https://wa.me/${full}${initialMessage ? `?text=${encodeURIComponent(initialMessage)}` : ''}`
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Intercept console.log to show on-screen when ?debug=1
  useEffect(() => {
    if (!debugMode) return
    const orig = console.log.bind(console)
    console.log = (...args: unknown[]) => {
      orig(...args)
      const line = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
      setDebugLogs(prev => [...prev.slice(-4), line])
    }
    return () => { console.log = orig }
  }, [debugMode])

  useEffect(() => {
    // Generate or recover anonymous session ID for isolating Google accounts per device
    let id = localStorage.getItem('qz_session_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('qz_session_id', id)
    }
    setSessionId(id)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-custom.js').catch(console.error)
    }

    // Client-side cron fallback (every minute)
    const cronInterval = setInterval(() => {
      fetch('/api/cron/check-messages').catch(() => {})
    }, 60000)

    return () => clearInterval(cronInterval)
  }, [])

  // Deep-link via server polling: every 1s (only when tab is visible).
  // The cron saves a PendingDeepLink doc when it sends a push; we consume it here.
  // This is the fallback when the app was already open (focus() path, no URL params).
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      console.log('[deeplink] fetching /api/deeplink')
      try {
        const res = await fetch('/api/deeplink')
        const data = await res.json()
        console.log('[deeplink] response:', data)
        if (!data || !data.phone || !data.countryCode) return
        setActiveTab('quick')
        setDeepLink({ phone: data.phone, countryCode: data.countryCode, message: data.message || '' })
        // Auto-redirect to WhatsApp — https://wa.me/ is a universal link, no user gesture needed
        const cleanPoll = data.phone.replace(/\D/g, '')
        const fullPoll  = `${data.countryCode}${cleanPoll}`
        window.location.href = `https://wa.me/${fullPoll}${data.message ? `?text=${encodeURIComponent(data.message)}` : ''}`
        // Overlay as fallback (visible for a split-second if universal link doesn't intercept)
        setWaOverlay({ phone: data.phone, countryCode: data.countryCode, message: data.message || '' })
      } catch {
        // ignore network errors
      }
    }

    // Poll immediately on mount
    poll()

    const interval = setInterval(poll, 1000)

    // Also poll immediately when the tab becomes visible (e.g. user opens app from notification)
    // Retry with delays to cover iOS cases where the app takes time to become visible
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      poll()
      setTimeout(poll, 500)
      setTimeout(poll, 1000)
      setTimeout(poll, 2000)
      setTimeout(poll, 3000)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Listen for DEEPLINK postMessage from service worker
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log('[SW message] received:', event.data)
      if (event.data?.type !== 'DEEPLINK') return
      const { phone, countryCode, message } = event.data
      if (!phone || !countryCode) return
      setActiveTab('quick')
      setDeepLink({ phone, countryCode, message: message || '' })
      setWaOverlay({ phone, countryCode, message: message || '' })
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/?tab=${tab}`, { scroll: false })
  }

  const handleScheduled = () => {
    setShowSuccess(true)
    setRefreshKey((k) => k + 1)
    setTimeout(() => setShowSuccess(false), 3000)
    setTimeout(() => handleTabChange('scheduled'), 1000)
  }

  const handleWaOverlaySend = () => {
    if (!waOverlay) return
    const cleanPhone = waOverlay.phone.replace(/\D/g, '')
    const fullPhone  = `${waOverlay.countryCode}${cleanPhone}`
    const waUrl      = `https://wa.me/${fullPhone}${waOverlay.message ? `?text=${encodeURIComponent(waOverlay.message)}` : ''}`
    window.open(waUrl, '_blank')
    setWaOverlay(null)
    // Clear URL params so overlay doesn't reappear on refresh
    router.replace('/', { scroll: false })
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'quick',     label: 'Enviar',            icon: '📤' },
    { id: 'schedule',  label: 'Programar mensaje', icon: '⏰' },
    { id: 'scheduled', label: 'Historial',         icon: '📋' },
  ]

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── WhatsApp overlay — shown when opened from notification ── */}
      {waOverlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
          style={{ background: '#075E54' }}
        >
          <div style={{ fontSize: 64, marginBottom: 8 }}>💬</div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
            Mensaje programado listo
          </p>
          <p style={{ color: '#a7f3d0', fontSize: 15, marginBottom: 8 }}>
            Para: +{waOverlay.countryCode}{waOverlay.phone}
          </p>
          {waOverlay.message ? (
            <p style={{
              color: '#d1fae5', fontSize: 14, marginBottom: 32,
              background: 'rgba(255,255,255,0.1)', padding: '10px 16px',
              borderRadius: 12, maxWidth: 320, wordBreak: 'break-word',
            }}>
              &ldquo;{waOverlay.message}&rdquo;
            </p>
          ) : (
            <div style={{ marginBottom: 32 }} />
          )}
          <button
            onClick={handleWaOverlaySend}
            style={{
              background: '#25D366', color: '#fff', border: 'none',
              borderRadius: 999, padding: '16px 40px',
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Abrir WhatsApp
          </button>
          <button
            onClick={() => { setWaOverlay(null); router.replace('/', { scroll: false }) }}
            style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', marginTop: 20, fontSize: 14, cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Header */}
      <header
        className="safe-top sticky top-0 z-30"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/sellia-icon.png" alt="Sellia" width={38} height={38} style={{ borderRadius: '11px', objectFit: 'contain' }} />
            <div>
              <h1 className="text-lg font-bold leading-tight font-space flex items-baseline gap-1">
                <span style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontStyle: 'italic', color: 'var(--sellia-wordmark)' }}>sellia</span>
                <span style={{ color: 'var(--text)' }}>Connect</span>
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Manda Whastapp sin guardar en contactos y programa tus mensajes para después conectando con tus contactos de google</p>
            </div>
          </div>
          <BellButton />
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderTop: '1px solid var(--border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex-1 py-3 text-sm font-medium transition-colors flex flex-col items-center gap-0.5"
              style={{
                color:        activeTab === tab.id ? '#0B2A62' : 'var(--text-dim)',
                borderBottom: activeTab === tab.id ? '2px solid #0B2A62' : '2px solid transparent',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-lg text-sm font-medium flex items-center gap-2"
          style={{ background: '#0B2A62', color: '#fff' }}>
          ✅ ¡Recordatorio programado!
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4">
        {activeTab === 'quick' && (
          <QuickSend
            initialPhone={deepLink.phone}
            initialMessage={deepLink.message}
            initialCountryCode={deepLink.countryCode}
          />
        )}
        {activeTab === 'schedule'  && <ScheduleMessage onScheduled={handleScheduled} sessionId={sessionId} />}
        {activeTab === 'scheduled' && <ScheduledList refreshKey={refreshKey} />}
      </main>

      {/* Debug log panel — only shown when ?debug=1 */}
      {debugMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-2" style={{ background: '#000', borderTop: '1px solid #00ff00' }}>
          {debugLogs.length === 0
            ? <p style={{ color: '#00ff00', fontSize: '10px', fontFamily: 'monospace' }}>— no logs yet —</p>
            : debugLogs.map((log, i) => (
              <p key={i} style={{ color: '#00ff00', fontSize: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{log}</p>
            ))
          }
        </div>
      )}

      {/* Footer */}
      <div className="text-center pb-3 pt-1">
        <a
          href="https://wa.quick.sellia.ai/politica-de-privacidad.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          Política de Privacidad
        </a>
      </div>

      {/* Bottom safe area */}
      <div className="safe-bottom h-4" />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-whatsapp-bg">
        <div className="w-10 h-10 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AppContent />
    </Suspense>
  )
}
