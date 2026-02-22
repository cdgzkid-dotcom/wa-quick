import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import ScheduledMessage from '@/app/lib/models/ScheduledMessage'
import PushSubscription from '@/app/lib/models/PushSubscription'
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

    const pendingMessages = await ScheduledMessage.find({
      sent: false,
      notified: false,
      scheduledAt: { $gte: twoMinutesAgo, $lte: now },
    }).lean()

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
      const fullPhone = `${msg.countryCode}${msg.phoneNumber}`
      const waUrl = `https://wa.me/${fullPhone}${msg.message ? `?text=${encodeURIComponent(msg.message)}` : ''}`

      const sendUrl = `/?tab=quick&phone=${encodeURIComponent(msg.phoneNumber)}&countryCode=${encodeURIComponent(msg.countryCode)}${msg.message ? `&message=${encodeURIComponent(msg.message)}` : ''}`

      const payload = {
        title: '⚡ Quick Zap - Mensaje Programado',
        body: `Recordatorio: enviar mensaje a +${fullPhone}${msg.message ? `\n"${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}"` : ''}`,
        url: sendUrl,
        messageId: msg._id.toString(),
        phoneNumber: fullPhone,
        phone: msg.phoneNumber,
        countryCode: msg.countryCode,
        message: msg.message || '',
        waUrl,
      }

      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, payload)
        if (result.expired) expiredEndpoints.push(sub.endpoint)
      }

      await ScheduledMessage.findByIdAndUpdate(msg._id, { notified: true, sent: true })
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
    console.error('Error checking messages:', error)
    return NextResponse.json({ error: 'Error al verificar mensajes' }, { status: 500 })
  }
}
