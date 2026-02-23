'use client'

import { useState, useEffect } from 'react'
import GoogleContacts from './GoogleContacts'

const COUNTRY_CODES = [
  { code: '52', flag: '🇲🇽', name: 'México' },
  { code: '1', flag: '🇺🇸', name: 'EE.UU.' },
  { code: '54', flag: '🇦🇷', name: 'Argentina' },
  { code: '57', flag: '🇨🇴', name: 'Colombia' },
  { code: '51', flag: '🇵🇪', name: 'Perú' },
  { code: '56', flag: '🇨🇱', name: 'Chile' },
  { code: '58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '34', flag: '🇪🇸', name: 'España' },
  { code: '55', flag: '🇧🇷', name: 'Brasil' },
  { code: '593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '504', flag: '🇭🇳', name: 'Honduras' },
  { code: '505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '507', flag: '🇵🇦', name: 'Panamá' },
  { code: '591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '44', flag: '🇬🇧', name: 'Reino Unido' },
]

type Props = {
  onScheduled: () => void
  sessionId?: string
}

export default function ScheduleMessage({ onScheduled, sessionId = '' }: Props) {
  const [countryCode, setCountryCode] = useState('52')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [hasContactPicker, setHasContactPicker] = useState(false)

  useEffect(() => {
    setHasContactPicker('contacts' in navigator)
  }, [])

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode)

  const handleContactPicker = async () => {
    if (!('contacts' in navigator)) return
    try {
      const contacts = await (navigator as Navigator & {
        contacts: {
          select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{
            name?: string[]
            tel?: string[]
          }>>
        }
      }).contacts.select(['name', 'tel'], { multiple: false })

      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        const tel = contact.tel?.[0] || ''
        const cleanTel = tel.replace(/[\s\-\(\)]/g, '')

        if (cleanTel.startsWith('+')) {
          const num = cleanTel.slice(1)
          const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
          const matched = sorted.find((c) => num.startsWith(c.code))
          if (matched) {
            setCountryCode(matched.code)
            setPhoneNumber(num.slice(matched.code.length))
          } else {
            setPhoneNumber(num)
          }
        } else {
          setPhoneNumber(cleanTel)
        }
      }
    } catch (err) {
      console.error('Contact picker error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phoneNumber.trim() || !scheduledAt) {
      setError('Por favor completa el número y la fecha/hora')
      return
    }

    // Strip non-digits, then strip country code prefix if it was baked in
    // (e.g. Google contact returned "521234567890" with countryCode "52")
    let cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.startsWith(countryCode) && cleanPhone.length > countryCode.length + 5) {
      cleanPhone = cleanPhone.slice(countryCode.length)
    }
    if (cleanPhone.length < 7) {
      setError('El número parece muy corto')
      return
    }

    console.log('[ScheduleMessage] saving → phoneNumber=%s | countryCode=%s | message=%s', cleanPhone, countryCode, message)

    setLoading(true)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          countryCode,
          message,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al programar')
      }

      // Reset form
      setPhoneNumber('')
      setMessage('')
      setScheduledAt('')
      onScheduled()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Phone input */}
      <div className="card">
        <label className="card-label">
          Número de WhatsApp
        </label>

        <div className="flex gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              className="input-field w-auto px-3 flex items-center gap-1 min-w-[80px]"
            >
              <span>{selectedCountry?.flag}</span>
              <span className="text-sm">+{countryCode}</span>
              <span className="text-gray-400">▾</span>
            </button>

            {showCountryPicker && (
              <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl border z-50 max-h-64 overflow-y-auto w-64"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountryCode(c.code)
                      setShowCountryPicker(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      c.code === countryCode ? 'bg-whatsapp-light' : ''
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-sm ml-auto" style={{ color: 'var(--text-dim)' }}>+{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="1234567890"
              className="input-field w-full"
              inputMode="tel"
            />
          </div>
        </div>

        {/* Contact picker button */}
        {hasContactPicker && (
          <button
            type="button"
            onClick={handleContactPicker}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-whatsapp-green text-whatsapp-teal text-sm font-medium active:bg-whatsapp-light transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
            </svg>
            Elegir contacto
          </button>
        )}
      </div>

      {/* Google Contacts */}
      <GoogleContacts
        sessionId={sessionId}
        onSelect={(phone, cc) => {
          setPhoneNumber(phone)
          setCountryCode(cc)
        }}
      />

      {/* Message */}
      <div className="card">
        <label className="card-label">
          Mensaje (opcional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe el mensaje que quieres enviar..."
          rows={3}
          className="input-field resize-none"
        />
      </div>

      {/* Date/Time */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <label className="card-label">
          Fecha y hora del recordatorio
        </label>
        <div style={{ width: '100%', overflow: 'hidden', borderRadius: '0.75rem' }}>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="input-field"
            style={{
              width: 'calc(100% + 1px)',
              maxWidth: 'calc(100% + 1px)',
              minWidth: '0',
              boxSizing: 'border-box',
              display: 'block',
              marginRight: '-1px',
            }}
            required
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !phoneNumber.trim() || !scheduledAt}
        className="btn-ship"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Guardando...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
            </svg>
            Programar mensaje
          </>
        )}
      </button>
    </form>
  )
}
