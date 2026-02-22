import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import ScheduledMessage from '@/app/lib/models/ScheduledMessage'

export async function GET() {
  try {
    await connectDB()
    const messages = await ScheduledMessage.find().sort({ scheduledAt: 1 }).lean()
    // Normalize _id to id for the client
    const normalized = messages.map(({ _id, ...rest }) => ({
      id: _id.toString(),
      ...rest,
    }))
    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, countryCode, message, scheduledAt } = body

    if (!phoneNumber || !countryCode || !scheduledAt) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: número, código de país y fecha/hora' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Fecha/hora inválida' }, { status: 400 })
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'La fecha debe ser en el futuro' },
        { status: 400 }
      )
    }

    await connectDB()
    const msg = await ScheduledMessage.create({
      phoneNumber: phoneNumber.trim(),
      countryCode: countryCode.trim(),
      message: message?.trim() || '',
      scheduledAt: scheduledDate,
    })

    return NextResponse.json(
      { id: msg._id.toString(), ...msg.toObject(), _id: undefined },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Error al guardar el mensaje' }, { status: 500 })
  }
}
