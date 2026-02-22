'use client'

import { useState, useEffect } from 'react'

type Permission = 'default' | 'granted' | 'denied'

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

export default function PushNotifications() {
  const [permission, setPermission] = useState<Permission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission as Permission)
    }

    // Check if service worker is supported and ready
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setSwReady(true)
        // Check if already subscribed
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub)
        })
      })
    }
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      // Request notification permission
      const result = await Notification.requestPermission()
      setPermission(result as Permission)

      if (result !== 'granted') {
        setError('Necesitas permitir las notificaciones para recibir recordatorios')
        return
      }

      // Register service worker if needed
      let registration = await navigator.serviceWorker.ready

      // Register custom SW if not already registered
      if (!registration.active) {
        registration = await navigator.serviceWorker.register('/sw-custom.js')
        await navigator.serviceWorker.ready
      }

      // Get VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error('Clave VAPID no configurada')
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Save subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!res.ok) throw new Error('Error al guardar la suscripción')

      setSubscribed(true)
    } catch (err: unknown) {
      console.error('Push subscribe error:', err)
      setError(
        err instanceof Error ? err.message : 'Error al activar notificaciones'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }

      setSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('WA Quick - Prueba', {
      body: 'Las notificaciones funcionan correctamente 🎉',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    })
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-gray-700">Notificaciones no disponibles</p>
            <p className="text-sm text-gray-500 mt-1">
              Tu navegador no soporta notificaciones push. Prueba con Chrome o Edge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">🔔</span>
        <div>
          <p className="font-semibold text-gray-800">Notificaciones Push</p>
          <p className="text-sm text-gray-500">
            Recibe alertas cuando llegue la hora de enviar un mensaje programado
          </p>
        </div>
      </div>

      {permission === 'denied' ? (
        <div className="bg-red-50 rounded-xl p-3 text-sm text-red-600 border border-red-100">
          <p className="font-medium">Notificaciones bloqueadas</p>
          <p className="mt-1 text-red-500">
            Ve a la configuración de tu navegador y permite notificaciones para este sitio.
          </p>
        </div>
      ) : subscribed ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-whatsapp-dark">
            <div className="w-2 h-2 bg-whatsapp-green rounded-full animate-pulse" />
            <span className="text-sm font-medium">Notificaciones activas</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={sendTestNotification}
              className="btn-secondary flex-1 text-sm py-2"
            >
              🔔 Probar
            </button>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="text-red-500 text-sm py-2 px-4 rounded-full border border-red-200 hover:bg-red-50 transition-colors"
            >
              {loading ? 'Desactivando...' : 'Desactivar'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSubscribe}
          disabled={loading || !swReady}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Activando...
            </>
          ) : (
            <>
              🔔 Activar notificaciones
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2">⚠️ {error}</p>
      )}

      {!swReady && !subscribed && (
        <p className="text-xs text-gray-400 mt-2">
          Cargando service worker...
        </p>
      )}
    </div>
  )
}
