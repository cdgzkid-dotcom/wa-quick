import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import GoogleAccount from '@/app/lib/models/GoogleAccount'

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id') || ''
  try {
    await connectDB()
    const accounts = await GoogleAccount.find(sessionId ? { sessionId } : { sessionId: '__none__' })
      .select('googleId email name picture createdAt')
      .lean()
    return NextResponse.json(
      accounts.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))
    )
  } catch {
    return NextResponse.json({ error: 'Error al obtener cuentas' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id') || ''
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await connectDB()
    // Only delete if the account belongs to this session
    await GoogleAccount.findOneAndDelete({ _id: id, ...(sessionId ? { sessionId } : {}) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar cuenta' }, { status: 500 })
  }
}
