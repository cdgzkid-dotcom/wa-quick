// Custom Service Worker for WA Quick
// Handles push notifications and offline caching
const SW_VERSION = '2.3.0'

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

  // Strategy: open /api/go (same origin — allowed by iOS) which returns an HTML page
  // that redirects to whatsapp://. WKWebView follows HTTP→custom-scheme redirects,
  // so this chain gets us into WhatsApp directly from the notification tap.
  const fullPhone = (countryCode && phone) ? `${countryCode}${phone}` : ''
  const encodedText = message ? encodeURIComponent(message) : ''
  const goUrl = fullPhone
    ? `/api/go?phone=${encodeURIComponent(fullPhone)}${encodedText ? `&text=${encodedText}` : ''}`
    : (url || '/')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const appClient = windowClients.find((c) => c.url.startsWith(self.registration.scope))
      if (appClient && appClient.navigate) {
        return appClient.navigate(goUrl).catch(() => clients.openWindow(goUrl))
      }
      return clients.openWindow(goUrl)
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
