import webpush from 'web-push'

if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  console.warn('VAPID keys not configured. Push notifications will not work.')
} else {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@wa-quick.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

export { webpush }

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: {
    title: string
    body: string
    url?: string
    messageId?: string
    phoneNumber?: string
    waUrl?: string
  }
) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/invalid
      return { success: false, expired: true }
    }
    console.error('Push notification error:', error)
    return { success: false, error: err.message }
  }
}
