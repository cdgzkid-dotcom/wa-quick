// Custom Service Worker for WA Quick
// Handles push notifications and offline caching
const SW_VERSION = '2.7.0'

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

  // 'send' action button: open WhatsApp directly — this was the original working behavior
  const { waUrl } = event.notification.data
  if (action === 'send' && waUrl) {
    event.waitUntil(clients.openWindow(waUrl))
    return
  }

  // Body tap: open app with deeplink params so overlay appears immediately
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
        // Preserve ?debug=1 if the client already has it (for testing)
        const clientUrl = new URL(appClient.url)
        const finalUrl = clientUrl.searchParams.get('debug') === '1'
          ? appUrl + '&debug=1'
          : appUrl
        if (typeof appClient.navigate === 'function') {
          return appClient.navigate(finalUrl).catch(() => appClient.focus())
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
