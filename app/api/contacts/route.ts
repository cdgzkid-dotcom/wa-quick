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
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )
  oauth2Client.setCredentials({
    access_token:  account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date:   account.expiresAt.getTime(),
  })

  // Refresh proactively if token expires in less than 5 min
  if (account.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    console.log(`[contacts] Token for ${account.email} is expiring — refreshing`)
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      await GoogleAccount.findByIdAndUpdate(account._id, {
        accessToken: credentials.access_token,
        expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
      })
      oauth2Client.setCredentials(credentials)
      console.log(`[contacts] Token refreshed for ${account.email}`)
    } catch (err) {
      console.error(`[contacts] Token refresh failed for ${account.email}:`, err)
      throw err
    }
  }

  return oauth2Client
}

async function fetchContactsForAccount(account: IGoogleAccount): Promise<GoogleContact[]> {
  console.log(`[contacts] Starting fetch for: ${account.email}`)
  const auth = await getRefreshedClient(account)
  const people = google.people({ version: 'v1', auth })
  const contacts: GoogleContact[] = []
  let pageToken: string | undefined
  let page = 0

  do {
    console.log(`[contacts] Page ${page + 1} for ${account.email}`)
    const res = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,phoneNumbers',
      sortOrder: 'FIRST_NAME_ASCENDING',
      ...(pageToken ? { pageToken } : {}),
    })

    const data = res.data
    console.log(`[contacts] Page ${page + 1} result:`, {
      status:          res.status,
      connectionsCount: data.connections?.length ?? 0,
      totalPeople:     data.totalPeople,
      totalItems:      data.totalItems,
      hasNextPage:     !!data.nextPageToken,
    })

    // Log a sample person to inspect the shape of the data
    if (data.connections && data.connections.length > 0) {
      const sample = data.connections[0]
      console.log(`[contacts] Sample person shape:`, JSON.stringify({
        names:        sample.names,
        phoneNumbers: sample.phoneNumbers,
      }).slice(0, 400))
    }

    if (!data.connections || data.connections.length === 0) {
      console.log(`[contacts] No connections returned for ${account.email} on page ${page + 1}`)
      break
    }

    let withPhone = 0
    for (const person of data.connections) {
      // Try all name fallbacks
      const name =
        person.names?.[0]?.displayName ||
        [person.names?.[0]?.givenName, person.names?.[0]?.familyName]
          .filter(Boolean)
          .join(' ') ||
        ''

      // Prefer canonicalForm (E.164) but fall back to raw value
      const phones = (person.phoneNumbers ?? [])
        .map((p) => p.canonicalForm || p.value || '')
        .filter(Boolean)

      if (name && phones.length > 0) {
        contacts.push({ name, phones, accountEmail: account.email })
        withPhone++
      }
    }

    console.log(
      `[contacts] Page ${page + 1}: ${data.connections.length} people, ${withPhone} with phone. Running total: ${contacts.length}`
    )

    pageToken = data.nextPageToken ?? undefined
    page++
  } while (pageToken && page < 5)

  console.log(`[contacts] Done for ${account.email}: ${contacts.length} contacts with phone numbers`)
  return contacts
}

export async function GET() {
  try {
    await connectDB()
    const accounts = await GoogleAccount.find()
    console.log(`[contacts] Connected accounts: ${accounts.length}`)

    if (accounts.length === 0) return NextResponse.json([])

    const results = await Promise.allSettled(accounts.map(fetchContactsForAccount))

    const all: GoogleContact[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value)
      } else {
        console.error('[contacts] Account fetch failed:', r.reason?.message ?? r.reason)
      }
    }

    console.log(`[contacts] Total contacts returned: ${all.length}`)
    all.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    return NextResponse.json(all)
  } catch (error) {
    console.error('[contacts] Route error:', error)
    return NextResponse.json({ error: 'Error al obtener contactos' }, { status: 500 })
  }
}
