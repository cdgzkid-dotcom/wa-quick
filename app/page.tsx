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
  const initialTab = (searchParams.get('tab') as Tab) || 'quick'
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
          <div className="w-9 h-9 bg-whatsapp-green rounded-full flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 16.938c-.26.733-.948 1.345-1.687 1.572-.548.17-1.256.207-2.022.042-.468-.101-1.054-.294-1.8-.617-3.298-1.432-5.447-4.74-5.612-4.964-.163-.22-1.315-1.748-1.315-3.33 0-1.58.83-2.356 1.123-2.678.293-.322.64-.403.854-.403.214 0 .428.002.615.01.197.01.462-.075.723.552.273.656.924 2.259.998 2.421.074.162.124.352.025.567-.099.214-.149.348-.298.537l-.446.517c-.147.17-.3.354-.13.694.173.34.77 1.27 1.65 2.057 1.134 1.009 2.089 1.32 2.384 1.47.297.148.47.124.644-.075.174-.198.743-.87.942-1.168.197-.298.395-.248.666-.149.27.1 1.73.817 2.027.967.297.149.495.223.57.347.073.124.073.72-.187 1.453z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">WA Quick</h1>
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
        {activeTab === 'quick' && <QuickSend />}
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
