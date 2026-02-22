'use client'

import { useState, useEffect } from 'react'
import GoogleContacts from './GoogleContacts'

const COUNTRY_CODES = [
  { code: '52',  flag: '🇲🇽', name: 'México' },
  { code: '1',   flag: '🇺🇸', name: 'EE.UU.' },
  { code: '54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '51',  flag: '🇵🇪', name: 'Perú' },
  { code: '56',  flag: '🇨🇱', name: 'Chile' },
  { code: '58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '34',  flag: '🇪🇸', name: 'España' },
  { code: '55',  flag: '🇧🇷', name: 'Brasil' },
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
  { code: '44',  flag: '🇬🇧', name: 'Reino Unido' },
  { code: '49',  flag: '🇩🇪', name: 'Alemania' },
  { code: '33',  flag: '🇫🇷', name: 'Francia' },
  { code: '39',  flag: '🇮🇹', name: 'Italia' },
  { code: '81',  flag: '🇯🇵', name: 'Japón' },
  { code: '86',  flag: '🇨🇳', name: 'China' },
]

type Contact = { name: string; phone: string; countryCode: string }

type Props = {
  initialPhone?:       string
  initialMessage?:     string
  initialCountryCode?: string
}

export default function QuickSend({
  initialPhone = '',
  initialMessage = '',
  initialCountryCode = '52',
}: Props) {
  const [countryCode, setCountryCode]       = useState('')
  const [phoneNumber, setPhoneNumber]       = useState('')
  const [message, setMessage]               = useState('')
  const [recentContacts, setRecentContacts] = useState<Contact[]>([])
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [hasContactPicker, setHasContactPicker]   = useState(false)

  useEffect(() => {
    setHasContactPicker('contacts' in navigator)
  }, [])

  // Sync whenever deep-link props change (notification tap, URL params).
  // When initialPhone is empty, resets the form to a clean state.
  useEffect(() => {
    setPhoneNumber(initialPhone || '')
    setMessage(initialMessage || '')
    setCountryCode(initialCountryCode || '52')
  }, [initialPhone, initialMessage, initialCountryCode])

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode)

  const handleSend = () => {
    if (!phoneNumber.trim()) return
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const fullPhone  = `${countryCode}${cleanPhone}`
    const waUrl      = `https://wa.me/${fullPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`

    const contact: Contact = { name: `+${fullPhone}`, phone: cleanPhone, countryCode }
    setRecentContacts((prev) => {
      const filtered = prev.filter((c) => c.phone !== cleanPhone)
      return [contact, ...filtered].slice(0, 5)
    })
    window.open(waUrl, '_blank')

    // Clear form after sending so old values don't persist on PWA resume
    setPhoneNumber('')
    setMessage('')
  }

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
        const tel = contacts[0].tel?.[0] || ''
        const cleanTel = tel.replace(/[\s\-\(\)]/g, '')
        if (cleanTel.startsWith('+')) {
          const num    = cleanTel.slice(1)
          const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
          const matched = sorted.find((c) => num.startsWith(c.code))
          if (matched) {
            setCountryCode(matched.code)
            setPhoneNumber(num.slice(matched.code.length))
          } else {
            setPhoneNumber(num)
          }
        } else {
          setPhoneNumber(cleanTel.replace(/^\+/, ''))
        }
      }
    } catch (err) {
      console.error('Contact picker error:', err)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Phone number card ── */}
      <div className="card">
        <label className="card-label">
          Número de WhatsApp
        </label>

        <div className="flex gap-2">
          {/* Country code picker */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              className="input-field w-auto px-3 flex items-center gap-1 min-w-[80px] h-full"
            >
              <span>{selectedCountry?.flag}</span>
              <span className="text-sm">+{countryCode}</span>
              <span style={{ color: 'var(--text-dim)' }}>▾</span>
            </button>

            {showCountryPicker && (
              <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto w-64"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCountryCode(c.code); setShowCountryPicker(false) }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      c.code === countryCode ? 'bg-whatsapp-light' : 'hover:bg-gray-50'
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

          {/* Phone number input */}
          <input
            type="tel"
            inputMode="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="1234567890"
            className="input-field phone-input flex-1 min-w-0"
          />
        </div>

        {/* Contact Picker API */}
        {hasContactPicker && (
          <button
            onClick={handleContactPicker}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-whatsapp-green text-whatsapp-teal text-sm font-medium active:opacity-70 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
            </svg>
            Elegir contacto
          </button>
        )}
      </div>

      {/* ── Google Contacts ── */}
      <GoogleContacts
        onSelect={(phone, cc) => {
          setPhoneNumber(phone)
          setCountryCode(cc)
        }}
      />

      {/* ── Message card ── */}
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

      {/* ── Send button ── */}
      <button
        onClick={handleSend}
        disabled={!phoneNumber.trim()}
        className="btn-ship"
      >
        <svg viewBox="0 0 100 100" width="18" height="18" aria-hidden="true" style={{ fill: 'currentColor', flexShrink: 0 }}>
          <path d="M58 12L25 55H48L40 88L75 45H52L58 12Z"/>
        </svg>
        Ship it now!!
      </button>

      {/* ── Recent contacts ── */}
      {recentContacts.length > 0 && (
        <div className="card">
          <p className="card-label">Recientes</p>
          <div className="space-y-1">
            {recentContacts.map((contact, i) => (
              <button
                key={i}
                onClick={() => { setCountryCode(contact.countryCode); setPhoneNumber(contact.phone) }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-whatsapp-light flex items-center justify-center text-whatsapp-teal font-bold text-sm flex-shrink-0">
                  {contact.name[1]}
                </div>
                <span className="text-sm font-space" style={{ color: 'var(--text)' }}>{contact.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
