import { NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import PendingDeepLink from '@/app/lib/models/PendingDeepLink'

export async function GET() {
  try {
    await connectDB()

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const doc = await PendingDeepLink.findOneAndUpdate(
      { used: false, createdAt: { $gte: fiveMinutesAgo } },
      { used: true },
      { sort: { createdAt: -1 }, new: false }
    ).lean()

    if (!doc) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      phone:       doc.phone,
      countryCode: doc.countryCode,
      message:     doc.message,
    })
  } catch (error) {
    console.error('Error fetching deep link:', error)
    return NextResponse.json(null)
  }
}
