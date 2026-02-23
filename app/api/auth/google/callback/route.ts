import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { connectDB } from '@/app/lib/mongoose'
import GoogleAccount from '@/app/lib/models/GoogleAccount'

function makeOAuth2Client(appUrl: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/api/auth/google/callback`
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const fail = (reason: string) =>
    NextResponse.redirect(`${appUrl}/?tab=quick&google_error=${reason}`)

  if (error || !code) return fail('denegado')

  const savedState = request.cookies.get('google_oauth_state')?.value
  if (!state || state !== savedState) return fail('estado_invalido')

  // Parse state JSON to extract sessionId
  let sessionId = ''
  try {
    const parsed = JSON.parse(state) as { nonce?: string; sessionId?: string }
    sessionId = parsed.sessionId || ''
  } catch {
    return fail('estado_invalido')
  }

  if (!sessionId) return fail('sin_sesion')

  try {
    const oauth2Client = makeOAuth2Client(appUrl)
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Fetch Google profile
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: profile } = await oauth2Api.userinfo.get()

    if (!profile.id || !profile.email) return fail('sin_perfil')

    await connectDB()

    const fields: Record<string, unknown> = {
      sessionId,
      email:       profile.email,
      name:        profile.name || profile.email,
      picture:     profile.picture || '',
      accessToken: tokens.access_token!,
      expiresAt:   new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
    }
    // Only overwrite refreshToken when Google sends one (first auth or forced consent)
    if (tokens.refresh_token) fields.refreshToken = tokens.refresh_token

    await GoogleAccount.findOneAndUpdate(
      { googleId: profile.id, sessionId },
      { $set: fields },
      { upsert: true, new: true }
    )

    const response = NextResponse.redirect(`${appUrl}/?tab=quick&google=conectado`)
    response.cookies.delete('google_oauth_state')
    return response
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return fail(encodeURIComponent(msg))
  }
}
