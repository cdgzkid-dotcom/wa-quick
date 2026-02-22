import { NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import PendingDeepLink from '@/app/lib/models/PendingDeepLink'

export async function GET() {
  try {
    await connectDB()

    const totalCount = await PendingDeepLink.countDocuments()
    const latest = await PendingDeepLink.findOne().sort({ createdAt: -1 }).lean()

    console.log('[deeplink] total docs in collection:', totalCount)
    if (latest) {
      console.log('[deeplink] most recent doc → phone=%s | used=%s | createdAt=%s',
        latest.phone, latest.used, latest.createdAt)
    } else {
      console.log('[deeplink] collection is empty')
    }

    const doc = await PendingDeepLink.findOneAndUpdate(
      { createdAt: { $gte: new Date(Date.now() - 60000) }, used: false },
      { used: true },
      { sort: { createdAt: -1 }, new: false }
    ).lean()

    if (!doc) {
      if (latest && latest.used) {
        console.log('[deeplink] no result: most recent doc is already used=true')
      } else if (latest && latest.createdAt < new Date(Date.now() - 60000)) {
        console.log('[deeplink] no result: most recent doc is older than 60 seconds (createdAt=%s)',
          latest.createdAt)
      } else {
        console.log('[deeplink] no result: no unused docs within 60 seconds')
      }
      return NextResponse.json(null)
    }

    console.log('[deeplink] returning → phone=%s | countryCode=%s | message=%s',
      doc.phone, doc.countryCode, doc.message)

    return NextResponse.json({
      phone:       doc.phone,
      countryCode: doc.countryCode,
      message:     doc.message,
    })
  } catch (error) {
    console.error('[deeplink] error:', error)
    return NextResponse.json(null)
  }
}
