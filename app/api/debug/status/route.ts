import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import ScheduledMessage from '@/app/lib/models/ScheduledMessage'
import PushSubscription from '@/app/lib/models/PushSubscription'
import PendingDeepLink from '@/app/lib/models/PendingDeepLink'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer waQuickSecret123') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await connectDB()
    const now = new Date()

    const [pendingMsgs, recentSent, subscriptions, recentDeeplinks] = await Promise.all([
      ScheduledMessage.find({ sent: false }).sort({ scheduledAt: 1 }).limit(10).lean(),
      ScheduledMessage.find({ sent: true }).sort({ scheduledAt: -1 }).limit(5).lean(),
      PushSubscription.find().lean(),
      PendingDeepLink.find().sort({ createdAt: -1 }).limit(5).lean(),
    ])

    return NextResponse.json({
      now: now.toISOString(),
      pendingMessages: pendingMsgs.map(m => ({
        id: m._id,
        phone: m.phoneNumber,
        countryCode: m.countryCode,
        scheduledAt: m.scheduledAt,
        minutesUntil: Math.round((new Date(m.scheduledAt).getTime() - now.getTime()) / 60000),
        sent: m.sent,
        notified: m.notified,
      })),
      recentSent: recentSent.map(m => ({
        phone: m.phoneNumber,
        scheduledAt: m.scheduledAt,
        sent: m.sent,
      })),
      pushSubscriptions: subscriptions.length,
      subscriptionEndpoints: subscriptions.map(s => s.endpoint.substring(0, 70) + '...'),
      recentDeeplinks: recentDeeplinks.map(d => ({
        phone: d.phone,
        used: d.used,
        createdAt: d.createdAt,
        ageSeconds: Math.round((now.getTime() - new Date(d.createdAt).getTime()) / 1000),
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
