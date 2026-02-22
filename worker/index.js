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
  const { waUrl, url, phone, countryCode, message } = event.notification.data

  if (action === 'send' && waUrl) {
    // "Enviar ahora" button → open WhatsApp directly
    event.waitUntil(clients.openWindow(waUrl))
    return
  }

  if (action === 'dismiss') return

  // Default body tap: open the app with short URL params.
  // page.tsx polls window.location.search after focus to pick them up.
  const scope   = self.registration.scope.replace(/\/$/, '')
  const deepUrl = `${scope}/?phone=${encodeURIComponent(phone)}&cc=${encodeURIComponent(countryCode)}&msg=${encodeURIComponent(message)}`

  event.waitUntil(clients.openWindow(deepUrl))
})

