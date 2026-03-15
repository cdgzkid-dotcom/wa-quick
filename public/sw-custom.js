// Custom Service Worker for WA Quick
// Handles push notifications and offline caching
const SW_VERSION = '3.2.0'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      messageId: data.messageId,
      phoneNumber: data.phoneNumber,
      waUrl: data.waUrl,
      phone: data.phone,
      countryCode: data.countryCode,
      message: data.message,
    },
    actions: [
      {
        action: 'send',
        title: '📤 Enviar ahora',
      },
      {
        action: 'dismiss',
        title: '❌ Descartar',
      },
    ],
    requireInteraction: true,
    tag: `wa-message-${data.messageId}`,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'WA Quick', options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { action } = event
  const { url, phone, countryCode, message } = event.notification.data

  if (action === 'dismiss') return

  // whatsapp:// deep link works on iOS from notification clicks (custom scheme)
  // wa.me (https://) is blocked by iOS WebKit for clients.openWindow()
  const fullPhone = (countryCode && phone) ? `${countryCode}${phone}` : ''
  const encodedMsg = message ? encodeURIComponent(message) : ''
  const waDeepLink = fullPhone
    ? `whatsapp://send?phone=${fullPhone}${encodedMsg ? `&text=${encodedMsg}` : ''}`
    : null

  const appUrl = url || '/'

  event.waitUntil(
    clients.openWindow(waDeepLink || appUrl).catch(() => clients.openWindow(appUrl))
  )
})

// Background sync for offline support
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-messages') {
    event.waitUntil(
      fetch('/api/cron/check-messages', {
        method: 'GET',
        headers: { 'x-cron-secret': 'client-sync' },
      }).catch(() => {})
    )
  }
})
