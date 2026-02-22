'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import QuickSend from './components/QuickSend'
import ScheduleMessage from './components/ScheduleMessage'
import ScheduledList from './components/ScheduledList'

const PushNotifications = dynamic(() => import('./components/PushNotifications'), {
  ssr: false,
  loading: () => null,
})

type Tab = 'quick' | 'schedule' | 'scheduled'

function AppContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Pre-fill values from push notification deep link
  const initialPhone       = searchParams.get('phone')       || ''
  const initialMessage     = searchParams.get('message')     || ''
  const initialCountryCode = searchParams.get('countryCode') || '52'

  // If phone param present, always land on "quick" tab
  const tabFromUrl = (searchParams.get('tab') as Tab) || 'quick'
  const initialTab: Tab = initialPhone ? 'quick' : tabFromUrl

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    // Register the custom service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-custom.js').catch(console.error)
    }

    // Check cron every minute (client-side fallback)
    const cronInterval = setInterval(() => {
      fetch('/api/cron/check-messages').catch(() => {})
    }, 60000)

    return () => clearInterval(cronInterval)
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
    { id: 'quick', label: 'Enviar', icon: '📤' },
    { id: 'schedule', label: 'Programar', icon: '⏰' },
    { id: 'scheduled', label: 'Agenda', icon: '📋' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-whatsapp-teal text-white safe-top sticky top-0 z-30 shadow-md">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-whatsapp-green rounded-full flex items-center justify-center shadow-sm text-xl">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Quick Zap</h1>
            <p className="text-xs text-green-200">WhatsApp sin guardar contactos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-whatsapp-dark">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex flex-col items-center gap-0.5 ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-whatsapp-green'
                  : 'text-green-200 border-b-2 border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-whatsapp-dark text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in">
          ✅ ¡Recordatorio programado!
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4">
        {/* Push notification prompt */}
        <PushNotifications />

        {/* Tab content */}
        {activeTab === 'quick' && (
          <QuickSend
            initialPhone={initialPhone}
            initialMessage={initialMessage}
            initialCountryCode={initialCountryCode}
          />
        )}
        {activeTab === 'schedule' && <ScheduleMessage onScheduled={handleScheduled} />}
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
