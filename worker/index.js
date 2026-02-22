// Custom worker code merged into next-pwa service worker
// This handles push notifications

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
    tag: `wa-message-${data.messageId || Date.now()}`,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Quick Zap', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { action } = event
  const { waUrl, url } = event.notification.data

  if (action === 'send' && waUrl) {
    // Open WhatsApp directly
    event.waitUntil(clients.openWindow(waUrl))
  } else if (action === 'dismiss') {
    // Already closed above — nothing more to do
  } else {
    // Default tap: open the app send screen with phone/message pre-filled
    const targetUrl = url || '/'
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        const appClient = windowClients.find((c) =>
          c.url.startsWith(self.registration.scope)
        )
        if (appClient) {
          appClient.navigate(targetUrl)
          return appClient.focus()
        }
        return clients.openWindow(targetUrl)
      })
    )
  }
})
