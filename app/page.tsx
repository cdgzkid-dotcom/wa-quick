'use client'

import { useState, useEffect, Suspense } from 'react'
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

  const initialPhone       = searchParams.get('phone')       || ''
  const initialMessage     = searchParams.get('message')     || ''
  const initialCountryCode = searchParams.get('countryCode') || '52'
  const tabFromUrl         = (searchParams.get('tab') as Tab) || 'quick'

  const [activeTab, setActiveTab]   = useState<Tab>(initialPhone ? 'quick' : tabFromUrl)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sessionId, setSessionId]   = useState('')
  const [debugLogs, setDebugLogs]   = useState<string[]>([])
  const [swVersion, setSwVersion]   = useState('')
  const debugMode = searchParams.get('debug') === '1'

  // Deep-link state — updated via server polling when a scheduled message is due.
  // deepLink.phone being non-empty is the trigger for the notification prompt card.
  const [deepLink, setDeepLink] = useState<DeepLink>({
    phone:       initialPhone,
    message:     initialMessage,
    countryCode: initialCountryCode,
  })

  const clearDeepLink = () => setDeepLink({ phone: '', message: '', countryCode: '52' })

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
    let id = localStorage.getItem('qz_session_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('qz_session_id', id)
    }
    setSessionId(id)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-custom.js').catch(console.error)
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'GET_VERSION' })
      })
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SW_VERSION') setSwVersion(e.data.version)
      })
    }

    const cronInterval = setInterval(() => {
      fetch('/api/cron/check-messages').catch(() => {})
    }, 60000)

    return () => clearInterval(cronInterval)
  }, [])

  // Server poll — fires when the app is visible.
  // When a pending deeplink is found, shows the notification prompt card.
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/deeplink')
        const data = await res.json()
        if (!data || !data.phone || !data.countryCode) return
        setActiveTab('scheduled')
        setDeepLink({ phone: data.phone, countryCode: data.countryCode, message: data.message || '' })
      } catch {
        // ignore network errors
      }
    }

    poll()
    const interval = setInterval(poll, 1000)

    // Poll immediately (+retries) whenever app comes to the foreground
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

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'quick',     label: 'Enviar',            icon: '📤' },
    { id: 'schedule',  label: 'Programar mensaje', icon: '⏰' },
    { id: 'scheduled', label: 'Historial',         icon: '📋' },
  ]

  return (
    <div className="min-h-screen flex flex-col">

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
        {activeTab === 'scheduled' && <ScheduledList refreshKey={refreshKey} fromDeepLink={!!deepLink.phone} />}
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
      <div className="text-center pb-3 pt-1 space-y-1">
        <a
          href="https://wa.quick.sellia.ai/politica-de-privacidad.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          Política de Privacidad
        </a>
        {swVersion && (
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>SW {swVersion}</p>
        )}
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
