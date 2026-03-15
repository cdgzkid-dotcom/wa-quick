import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import ScheduledMessage from '@/app/lib/models/ScheduledMessage'
import PushSubscription from '@/app/lib/models/PushSubscription'
import PendingDeepLink from '@/app/lib/models/PendingDeepLink'
import { sendPushNotification } from '@/app/lib/webpush'

export async function GET(request: NextRequest) {
  // Vercel Cron sends: Authorization: Bearer {CRON_SECRET}
  // In production, enforce it. In development, allow all requests.
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET
    const auth = request.headers.get('authorization')
    if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    await connectDB()

    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

    // Atomically claim messages one by one to prevent race conditions
    // when the cron runs in parallel (find + update in a single operation)
    const pendingMessages = []
    while (true) {
      const claimed = await ScheduledMessage.findOneAndUpdate(
        { sent: false, notified: false, scheduledAt: { $gte: twoMinutesAgo, $lte: now } },
        { notified: true, sent: true },
        { new: false }
      ).lean()
      if (!claimed) break
      pendingMessages.push(claimed)
    }

    if (pendingMessages.length === 0) {
      return NextResponse.json({ notified: 0, message: 'No hay mensajes pendientes' })
    }

    const subscriptions = await PushSubscription.find().lean()

    if (subscriptions.length === 0) {
      return NextResponse.json({
        notified: 0,
        message: 'No hay suscripciones push registradas',
      })
    }

    let notifiedCount = 0
    const expiredEndpoints: string[] = []

    for (const msg of pendingMessages) {
      const cc = msg.countryCode

      // Strip country code if it was stored inside phoneNumber (e.g. Google contact
      // returned "521234567890" instead of "1234567890" with countryCode "52").
      // Only strip when the remaining digits are at least 6 (avoids false positives).
      let phone = msg.phoneNumber
      if (phone.startsWith(cc) && phone.length > cc.length + 5) {
        phone = phone.slice(cc.length)
      }

      console.log('[cron] msg id=%s | stored phoneNumber=%s | countryCode=%s | resolved phone=%s | message=%s',
        msg._id, msg.phoneNumber, cc, phone, msg.message || '')

      const fullPhone = `${cc}${phone}`
      const waUrl = `https://wa.me/${fullPhone}${msg.message ? `?text=${encodeURIComponent(msg.message)}` : ''}`

      const sendUrl = `/?tab=quick&phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(cc)}${msg.message ? `&message=${encodeURIComponent(msg.message)}` : ''}`

      const payload = {
        title: 'Sellia Connect - Mensaje Programado',
        body: `Recordatorio: enviar mensaje a +${fullPhone}${msg.message ? `\n"${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}"` : ''}`,
        url: sendUrl,
        messageId: msg._id.toString(),
        phoneNumber: fullPhone,
        phone,
        countryCode: cc,
        message: msg.message || '',
        waUrl,
      }

      // Create deeplink BEFORE sending push so it exists when the notification is tapped,
      // even if Vercel cuts the function short after the push is sent.
      const deepLinkDoc = await PendingDeepLink.create({
        phone,
        countryCode: cc,
        message: msg.message || '',
        used: false,
      })

      let atLeastOneSent = false
      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, payload)
        if (result.expired) {
          expiredEndpoints.push(sub.endpoint)
        } else {
          atLeastOneSent = true
        }
      }

      // If no subscription accepted the push, clean up the deeplink to avoid ghost docs
      if (!atLeastOneSent) {
        await PendingDeepLink.deleteOne({ _id: deepLinkDoc._id })
      }

      notifiedCount++
    }

    if (expiredEndpoints.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: expiredEndpoints } })
    }

    return NextResponse.json({
      notified: notifiedCount,
      expiredSubscriptionsRemoved: expiredEndpoints.length,
    })
  } catch (error) {
    // Limpiar conexión cacheada para forzar reconexión en el siguiente intento
    if (globalThis._mongooseConn) {
      globalThis._mongooseConn.conn = null
      globalThis._mongooseConn.promise = null
    }
    console.error('Error checking messages:', error)
    return NextResponse.json({ error: 'Error al verificar mensajes' }, { status: 500 })
  }
}
