// Custom Service Worker for WA Quick
// Handles push notifications and offline caching
const SW_VERSION = '2.5.0'

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

  // Build app URL with wa data as params so the page shows the overlay immediately,
  // without waiting for the 1-second deeplink poll.
  const fullPhone = (countryCode && phone) ? `${countryCode}${phone}` : ''
  const params = new URLSearchParams()
  params.set('tab', 'quick')
  if (phone)       params.set('phone', phone)
  if (countryCode) params.set('countryCode', countryCode)
  if (message)     params.set('message', message)
  params.set('notif', '1')
  const appUrl = `/?${params.toString()}`

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const appClient = windowClients.find((c) => c.url.startsWith(self.registration.scope))
      if (appClient) {
        // navigate() passes URL params so the page auto-redirects to WhatsApp
        if (typeof appClient.navigate === 'function') {
          return appClient.navigate(appUrl).catch(() => appClient.focus())
        }
        return appClient.focus()
      }
      return clients.openWindow(appUrl)
    })
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
