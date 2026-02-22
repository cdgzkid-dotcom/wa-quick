// Custom worker code merged into next-pwa service worker
// This handles push notifications

// SW-global pending deep link — page can request it via GET_PENDING_DEEP_LINK message
let pendingDeepLink = null

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

  // Default body tap → show the send screen with data pre-filled
  const scope   = self.registration.scope.replace(/\/$/, '')
  const deepUrl = `${scope}/?tab=quick&phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode)}&message=${encodeURIComponent(message)}`

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const appClient = windowClients.find((c) =>
        c.url.startsWith(self.registration.scope)
      )

      if (appClient) {
        // Store in SW global so the page can fetch it via GET_PENDING_DEEP_LINK
        pendingDeepLink = { phone, countryCode, message }
        // Try postMessage (may fail on iOS when app is in background)
        appClient.postMessage({ type: 'NOTIFICATION_TAP', phone, countryCode, message })
        return appClient.focus()
      }

      // Fallback: app is closed → open with URL params
      return clients.openWindow(deepUrl)
    })
  )
})

// Page can request the stored deep link (iOS fallback when postMessage didn't arrive)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_PENDING_DEEP_LINK' && pendingDeepLink) {
    event.source.postMessage({ type: 'NOTIFICATION_TAP', ...pendingDeepLink })
    pendingDeepLink = null
  }
})
