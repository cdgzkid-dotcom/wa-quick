import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import ScheduledMessage from '@/app/lib/models/ScheduledMessage'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await connectDB()

    const message = await ScheduledMessage.findById(id)
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    await ScheduledMessage.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: 'Error al eliminar el mensaje' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { phoneNumber, countryCode, message, scheduledAt } = body

    await connectDB()

    const existing = await ScheduledMessage.findById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    if (existing.sent) {
      return NextResponse.json(
        { error: 'No se puede editar un mensaje ya enviado' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (phoneNumber) updates.phoneNumber = phoneNumber.trim()
    if (countryCode) updates.countryCode = countryCode.trim()
    if (message !== undefined) updates.message = message.trim()
    if (scheduledAt) {
      updates.scheduledAt = new Date(scheduledAt)
      updates.notified = false
    }

    const updated = await ScheduledMessage.findByIdAndUpdate(id, updates, {
      new: true,
    }).lean()

    if (!updated) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    const { _id, ...rest } = updated
    return NextResponse.json({ id: _id.toString(), ...rest })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'Error al actualizar el mensaje' }, { status: 500 })
  }
}
