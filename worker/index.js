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
      url:         data.url || '/',
      messageId:   data.messageId,
      phoneNumber: data.phoneNumber,  // full number (countryCode+phone), for display
      phone:       data.phone        || '',
      countryCode: data.countryCode  || '52',
      message:     data.message      || '',
      waUrl:       data.waUrl,
    },
    actions: [
      { action: 'send',    title: '📤 Enviar ahora' },
      { action: 'dismiss', title: '❌ Descartar'    },
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
  const { waUrl, phone, countryCode, message } = event.notification.data

  if (action === 'send' && waUrl) {
    event.waitUntil(clients.openWindow(waUrl))
    return
  }

  if (action === 'dismiss') return

  // Store deep-link data in SW global so the page can request it
  self.pendingDeepLink = { phone, countryCode, message }

  // Focus existing window (iOS resume) or open app fresh
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const appClient = windowClients.find((c) => c.url.startsWith(self.registration.scope))
      if (appClient) return appClient.focus()
      return clients.openWindow('/')
    })
  )
})

// Page requests stored deep-link via GET_DEEPLINK message
self.addEventListener('message', (event) => {
  if (event.data === 'GET_DEEPLINK' && self.pendingDeepLink) {
    event.source.postMessage({ type: 'DEEPLINK', ...self.pendingDeepLink })
    self.pendingDeepLink = null
  }
})

