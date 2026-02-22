import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import PushSubscription from '@/app/lib/models/PushSubscription'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Suscripción push inválida' },
        { status: 400 }
      )
    }

    await connectDB()

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { p256dh: keys.p256dh, auth: keys.auth },
      { upsert: true, new: true }
    )

    return NextResponse.json(
      { success: true, id: subscription._id.toString() },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving push subscription:', error)
    return NextResponse.json(
      { error: 'Error al guardar la suscripción' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 })
    }

    await connectDB()
    await PushSubscription.deleteMany({ endpoint })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing push subscription:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la suscripción' },
      { status: 500 }
    )
  }
}
