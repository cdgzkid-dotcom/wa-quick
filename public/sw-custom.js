// Custom Service Worker for WA Quick
// Handles push notifications and offline caching
const SW_VERSION = '3.11.0'

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
  const { waUrl, url } = event.notification.data

  if (action === 'dismiss') return

  if (action === 'send' && waUrl) {
    // "📤 Enviar ahora" action button — open WhatsApp directly.
    // This runs inside a notificationclick user-gesture context on iOS 16.4+
    // so the universal link interception works and WhatsApp opens immediately.
    event.waitUntil(clients.openWindow(waUrl))
    return
  }

  // Body tap — bring the app to the foreground so the deeplink poll
  // detects the pending record and shows the "Abrir WhatsApp" card.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const appClient = windowClients.find((c) => c.url.startsWith(self.registration.scope))
      if (appClient) return appClient.focus()
      return clients.openWindow(url || '/')
    })
  )
})

// Respond to version queries from page.tsx
self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', version: SW_VERSION })
  }
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
