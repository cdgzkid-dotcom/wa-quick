import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function makeOAuth2Client(appUrl: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/api/auth/google/callback`
  )
}

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth no configurado. Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.' },
      { status: 503 }
    )
  }

  const sessionId = new URL(request.url).searchParams.get('session_id') || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const state = JSON.stringify({ nonce: crypto.randomUUID(), sessionId })
  const oauth2Client = makeOAuth2Client(appUrl)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/contacts.readonly',
    ],
    prompt: 'consent', // Always return refresh_token
    state,
  })

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 min
    sameSite: 'lax', // Required for OAuth redirects
    path: '/',
  })
  return response
}
