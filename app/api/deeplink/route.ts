import { NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import PendingDeepLink from '@/app/lib/models/PendingDeepLink'

// GET — peek only, does NOT mark as used.
// The poll can read the deeplink as many times as needed without consuming it.
// The deeplink is only consumed when the user explicitly acts on it (PATCH).
export async function GET() {
  try {
    await connectDB()

    const doc = await PendingDeepLink.findOne(
      { createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) }, used: false },
      null,
      { sort: { createdAt: -1 } }
    ).lean()

    if (!doc) return NextResponse.json(null)

    return NextResponse.json({
      phone:       doc.phone,
      countryCode: doc.countryCode,
      message:     doc.message,
    })
  } catch (error) {
    console.error('[deeplink] GET error:', error)
    return NextResponse.json(null)
  }
}

// PATCH — mark the most recent unused deeplink as used.
// Called when the user taps "Abrir WhatsApp" or "Cancelar" in the card.
export async function PATCH() {
  try {
    await connectDB()
    await PendingDeepLink.findOneAndUpdate(
      { createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) }, used: false },
      { used: true },
      { sort: { createdAt: -1 } }
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[deeplink] PATCH error:', error)
    return NextResponse.json({ ok: false })
  }
}
