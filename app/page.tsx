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

  // Initial values from URL params (app launched from notification while closed)
  const initialPhone       = searchParams.get('phone')       || ''
  const initialMessage     = searchParams.get('message')     || ''
  const initialCountryCode = searchParams.get('countryCode') || '52'
  const tabFromUrl         = (searchParams.get('tab') as Tab) || 'quick'

  const [activeTab, setActiveTab]   = useState<Tab>(initialPhone ? 'quick' : tabFromUrl)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sessionId, setSessionId]   = useState('')


  // Deep-link state — starts from URL params, updated via postMessage from SW
  const [deepLink, setDeepLink] = useState<DeepLink>({
    phone:       initialPhone,
    message:     initialMessage,
    countryCode: initialCountryCode,
  })

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

  // Deep-link via server polling: every 3 s (only when tab is visible).
  // The cron saves a PendingDeepLink doc when it sends a push; we consume it here.
  // Polling is more reliable on iOS than focus/visibilitychange events.
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      console.log('[deeplink] fetching /api/deeplink')
      try {
        const res = await fetch('/api/deeplink')
        const data = await res.json()
        console.log('[deeplink] response:', data)
        if (data?.phone && data?.countryCode) {
          setActiveTab('quick')
          setDeepLink({ phone: data.phone, countryCode: data.countryCode, message: data.message || '' })
        }
      } catch {
        // ignore network errors
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
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
    { id: 'quick',     label: 'Enviar',    icon: '📤' },
    { id: 'schedule',  label: 'Programar', icon: '⏰' },
    { id: 'scheduled', label: 'Agenda',    icon: '📋' },
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
            <img src="/assets/sellia-logo.png" alt="Sellia" width={38} height={38} style={{ borderRadius: '11px', objectFit: 'contain' }} />
            <div>
              <h1 className="text-lg font-bold leading-tight font-space">
                <span style={{ color: 'var(--accent)' }}>sellia</span>{' '}
                <span style={{ color: 'var(--text)' }}>Connect</span>
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>WhatsApp sin guardar contactos</p>
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
            sessionId={sessionId}
          />
        )}
        {activeTab === 'schedule'  && <ScheduleMessage onScheduled={handleScheduled} sessionId={sessionId} />}
        {activeTab === 'scheduled' && <ScheduledList refreshKey={refreshKey} />}
      </main>

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
