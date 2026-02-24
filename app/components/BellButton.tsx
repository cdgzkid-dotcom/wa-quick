'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export default function BellButton() {
  const [subscribed, setSubscribed] = useState(false)
  const [denied, setDenied]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [supported, setSupported]   = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setSupported(true)
    setDenied(Notification.permission === 'denied')
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    })
  }, [])

  // Not rendered during SSR or when push isn't supported
  if (!supported) return null

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (subscribed) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } else {
        const result = await Notification.requestPermission()
        if (result === 'denied') { setDenied(true); return }
        if (result !== 'granted') return

        const reg      = await navigator.serviceWorker.ready
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        setSubscribed(true)
        setDenied(false)
      }
    } catch (err) {
      console.error('BellButton error:', err)
    } finally {
      setLoading(false)
    }
  }

  const dotColor = subscribed
    ? 'bg-[#22c55e] animate-pulse'
    : denied
    ? 'bg-red-400'
    : 'bg-gray-400'

  const title = denied
    ? 'Notificaciones bloqueadas en el navegador'
    : subscribed
    ? 'Notificaciones activas — toca para desactivar'
    : 'Activar notificaciones push'

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={title}
      className="relative flex items-center justify-center w-9 h-9 rounded-full active:opacity-70 transition-opacity"
    >
      <span className="text-xl leading-none">{loading ? '⏳' : '🔔'}</span>
      {/* Status dot */}
      <span
        className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 ${dotColor}`}
        style={{ borderColor: 'var(--bg)' }}
      />
    </button>
  )
}
