// Custom Service Worker for WA Quick
// Handles push notifications and offline caching
const SW_VERSION = '3.15.0'

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

// Build the WhatsApp universal link from the notification payload.
// Prefers waUrl (the cron already builds it); falls back to assembling it from
// the parts so notifications sent by older versions still work. Returns null
// when there is not enough data — the caller then falls back to opening the PWA.
function buildWaUrl(data) {
  if (!data) return null
  if (data.waUrl) return data.waUrl
  if (!data.countryCode || !data.phone) return null
  // encodeURIComponent handles emojis and newlines as UTF-8 percent-escapes.
  const text = data.message ? `?text=${encodeURIComponent(data.message)}` : ''
  return `https://wa.me/${data.countryCode}${data.phone}${text}`
}

// Fallback path: bring the PWA to the foreground so the server-side deeplink
// poll picks up the pending record and shows the message in Historial.
// This is the iOS-safe route documented in CLAUDE.md — do not remove it.
function openApp(appUrl) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    const appClient = windowClients.find((c) => c.url.startsWith(self.registration.scope))
    if (appClient) return appClient.focus()
    return clients.openWindow(appUrl || '/')
  })
}

// Cierra el ciclo que antes cerraba handleSendNow() en ScheduledList: marcar el
// mensaje como atendido y consumir el deeplink. Con el flujo directo la PWA ya no
// se abre, así que nadie hacía ninguna de las dos cosas y el mensaje se quedaba
// atascado en Pendientes con el historial de Enviados siempre vacío.
// keepalive: la petición tiene que sobrevivir a que iOS suspenda el SW cuando
// WhatsApp pasa a primer plano.
function markHandled(messageId) {
  const opts = { method: 'PATCH', keepalive: true }
  const tasks = [fetch('/api/deeplink', opts).catch(() => {})]
  if (messageId) {
    tasks.push(fetch(`/api/messages/${messageId}`, opts).catch(() => {}))
  }
  return Promise.all(tasks)
}

// Try WhatsApp first, fall back to the PWA. openWindow can reject, and on some
// iOS versions it resolves null even though nothing opened — both cases fall back.
function openWhatsAppOrApp(waUrl, appUrl, messageId) {
  if (!waUrl) return openApp(appUrl)
  // Two-argument then: the rejection handler covers openWindow only. Chaining a
  // .catch() instead would also catch a failing openApp() and retry it twice.
  return clients.openWindow(waUrl).then(
    // Solo se marca cuando WhatsApp abrió de verdad. Si caemos al fallback NO se
    // marca ni se consume el deeplink: la PWA necesita el deeplink vivo para
    // mostrar el mensaje, y su botón "Enviar ahora" hará el PATCH como siempre.
    (win) => (win ? markHandled(messageId) : openApp(appUrl)),
    () => openApp(appUrl)
  )
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const data = event.notification.data || {}

  // Body tap and "📤 Enviar ahora" now do the same thing: open WhatsApp directly.
  // Both run inside the notificationclick user-gesture context, which is what
  // makes iOS 16.4+ intercept the wa.me universal link instead of opening Safari.
  event.waitUntil(openWhatsAppOrApp(buildWaUrl(data), data.url, data.messageId))
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
