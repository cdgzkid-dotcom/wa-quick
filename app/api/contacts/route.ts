import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { connectDB } from '@/app/lib/mongoose'
import GoogleAccount, { IGoogleAccount } from '@/app/lib/models/GoogleAccount'

export interface GoogleContact {
  name: string
  phones: string[]
  accountEmail: string
}

async function getRefreshedClient(account: IGoogleAccount) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({
    access_token:  account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date:   account.expiresAt.getTime(),
  })

  // Refresh proactively if token expires in less than 5 min
  if (account.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await GoogleAccount.findByIdAndUpdate(account._id, {
      accessToken: credentials.access_token,
      expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
    })
    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}

async function fetchContactsForAccount(account: IGoogleAccount): Promise<GoogleContact[]> {
  const auth = await getRefreshedClient(account)
  const people = google.people({ version: 'v1', auth })
  const contacts: GoogleContact[] = []
  let pageToken: string | undefined
  let page = 0

  do {
    const { data } = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,phoneNumbers',
      ...(pageToken ? { pageToken } : {}),
    })

    for (const person of data.connections ?? []) {
      const name   = person.names?.[0]?.displayName
      const phones = (person.phoneNumbers ?? [])
        .map((p) => p.value ?? '')
        .filter(Boolean)

      if (name && phones.length > 0) {
        contacts.push({ name, phones, accountEmail: account.email })
      }
    }

    pageToken = data.nextPageToken ?? undefined
    page++
  } while (pageToken && page < 5) // cap at 5000 contacts per account

  return contacts
}

export async function GET() {
  try {
    await connectDB()
    const accounts = await GoogleAccount.find()

    if (accounts.length === 0) return NextResponse.json([])

    const results = await Promise.allSettled(accounts.map(fetchContactsForAccount))

    const all: GoogleContact[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value)
      else console.error('Error fetching Google contacts:', r.reason)
    }

    all.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    return NextResponse.json(all)
  } catch (error) {
    console.error('Contacts route error:', error)
    return NextResponse.json({ error: 'Error al obtener contactos' }, { status: 500 })
  }
}
