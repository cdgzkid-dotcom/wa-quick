'use client'

import { useState, useEffect, useCallback } from 'react'

// Google Client ID is public (it appears in the OAuth URL)
const GOOGLE_ENABLED = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

const COUNTRY_CODES = [
  { code: '52',  name: 'México' },
  { code: '1',   name: 'EE.UU.' },
  { code: '54',  name: 'Argentina' },
  { code: '57',  name: 'Colombia' },
  { code: '51',  name: 'Perú' },
  { code: '56',  name: 'Chile' },
  { code: '58',  name: 'Venezuela' },
  { code: '34',  name: 'España' },
  { code: '55',  name: 'Brasil' },
  { code: '593', name: 'Ecuador' },
  { code: '502', name: 'Guatemala' },
  { code: '503', name: 'El Salvador' },
  { code: '504', name: 'Honduras' },
  { code: '505', name: 'Nicaragua' },
  { code: '506', name: 'Costa Rica' },
  { code: '507', name: 'Panamá' },
  { code: '591', name: 'Bolivia' },
  { code: '595', name: 'Paraguay' },
  { code: '598', name: 'Uruguay' },
  { code: '44',  name: 'Reino Unido' },
  { code: '49',  name: 'Alemania' },
  { code: '33',  name: 'Francia' },
  { code: '39',  name: 'Italia' },
  { code: '81',  name: 'Japón' },
  { code: '86',  name: 'China' },
]

function parsePhone(raw: string): { phone: string; countryCode: string } {
  const clean = raw.replace(/[\s\-\(\)\.]/g, '')
  if (clean.startsWith('+')) {
    const num = clean.slice(1)
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
    const match = sorted.find((c) => num.startsWith(c.code))
    if (match) return { phone: num.slice(match.code.length), countryCode: match.code }
    return { phone: num, countryCode: '52' }
  }
  return { phone: clean.replace(/\D/g, ''), countryCode: '52' }
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

interface GContact {
  name: string
  phones: string[]
  accountEmail: string
}

interface GAccount {
  id: string
  email: string
  name: string
  picture: string
}

interface Props {
  onSelect: (phone: string, countryCode: string) => void
}

export default function GoogleContacts({ onSelect }: Props) {
  const [expanded, setExpanded]           = useState(false)
  const [accounts, setAccounts]           = useState<GAccount[]>([])
  const [contacts, setContacts]           = useState<GContact[]>([])
  const [search, setSearch]               = useState('')
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState('')
  const [toast, setToast]                 = useState('')

  // Don't render at all if Google OAuth is not configured
  if (!GOOGLE_ENABLED) return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // Check for OAuth callback result in URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'conectado') {
      setToast('Cuenta de Google conectada')
      setExpanded(true)
      window.history.replaceState({}, '', '/?tab=quick')
      setTimeout(() => setToast(''), 3000)
    } else if (params.get('google_error')) {
      setToast('Error al conectar Google: ' + params.get('google_error'))
      window.history.replaceState({}, '', '/?tab=quick')
      setTimeout(() => setToast(''), 4000)
    }

    // Load connected accounts
    fetch('/api/auth/google/accounts')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAccounts(d) })
      .catch(console.error)
      .finally(() => setAccountsLoading(false))
  }, [])

  const loadContacts = useCallback(async () => {
    if (contacts.length > 0 || accounts.length === 0) return
    setContactsLoading(true)
    setContactsError('')
    try {
      const res = await fetch('/api/contacts')
      const data = await res.json()
      if (Array.isArray(data)) setContacts(data)
      else setContactsError('Error al cargar contactos')
    } catch {
      setContactsError('Error de red al cargar contactos')
    } finally {
      setContactsLoading(false)
    }
  }, [accounts.length, contacts.length])

  useEffect(() => {
    if (expanded && accounts.length > 0) loadContacts()
  }, [expanded, accounts.length, loadContacts])

  const handleDisconnect = async (id: string) => {
    await fetch('/api/auth/google/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setContacts([])
  }

  const handleSelect = (rawPhone: string) => {
    const { phone, countryCode } = parsePhone(rawPhone)
    onSelect(phone, countryCode)
    setExpanded(false)
    setSearch('')
  }

  const filtered = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phones.some((p) => p.includes(search))
      )
    : []

  if (accountsLoading) return null

  return (
    <div className="card">
      {/* Toast */}
      {toast && (
        <div className={`mb-3 text-xs px-3 py-2 rounded-lg font-medium ${
          toast.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-whatsapp-light text-whatsapp-dark'
        }`}>
          {toast}
        </div>
      )}

      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <GoogleIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Contactos de Google</span>
          {accounts.length > 0 && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Connected accounts */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <p className="card-label">
                Cuentas conectadas
              </p>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: 'var(--hover)' }}
                >
                  {account.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.picture}
                      alt={account.name}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                      {account.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-gray-600 flex-1 truncate">{account.email}</span>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(account.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-1 text-base leading-none"
                    title="Desconectar cuenta"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Connect button */}
          <a
            href="/api/auth/google/init"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium shadow-sm active:opacity-70 transition-opacity"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <GoogleIcon className="w-4 h-4 flex-shrink-0" />
            {accounts.length === 0 ? 'Conectar cuenta de Google' : 'Conectar otra cuenta'}
          </a>

          {/* Search + contacts list */}
          {accounts.length > 0 && (
            <>
              <input
                type="search"
                placeholder="Buscar contacto por nombre o número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field text-sm"
              />

              {contactsLoading && (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                  <div className="w-6 h-6 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Cargando contactos…</span>
                </div>
              )}

              {contactsError && !contactsLoading && (
                <div className="text-xs text-red-500 text-center py-4">
                  {contactsError}
                  <button
                    type="button"
                    onClick={() => { setContacts([]); loadContacts() }}
                    className="block mx-auto mt-1 text-whatsapp-teal underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!contactsLoading && !contactsError && search && (
                <div className="max-h-64 overflow-y-auto -mx-1 px-1 space-y-1">
                  {filtered.slice(0, 100).map((contact, i) => (
                    <div key={i} className="rounded-xl p-2 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-800 mb-1 leading-tight">
                        {contact.name}
                        <span className="text-xs font-normal text-gray-400 ml-1.5">
                          {contact.accountEmail}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {contact.phones.map((phone, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => handleSelect(phone)}
                            className="text-xs bg-whatsapp-light text-whatsapp-teal px-2.5 py-1 rounded-full font-medium active:bg-whatsapp-green active:text-white transition-colors"
                          >
                            {phone}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {filtered.length > 100 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Mostrando 100 de {filtered.length}. Escribe para filtrar.
                    </p>
                  )}

                  {filtered.length === 0 && contacts.length > 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">
                      Sin resultados para &ldquo;{search}&rdquo;
                    </p>
                  )}

                  {contacts.length === 0 && !contactsLoading && search && (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No se encontraron contactos con número de teléfono.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
