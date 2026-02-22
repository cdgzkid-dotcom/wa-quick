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

const DIAL_KEYS = [
  { digit: '1', sub: ''     },
  { digit: '2', sub: 'ABC'  },
  { digit: '3', sub: 'DEF'  },
  { digit: '4', sub: 'GHI'  },
  { digit: '5', sub: 'JKL'  },
  { digit: '6', sub: 'MNO'  },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV'  },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: ''     },
  { digit: '0', sub: '+'    },
  { digit: '⌫', sub: ''     },
]

type Contact = {
  name: string
  phone: string
  countryCode: string
}

type Props = {
  initialPhone?: string
  initialMessage?: string
  initialCountryCode?: string
}

export default function QuickSend({ initialPhone = '', initialMessage = '', initialCountryCode = '52' }: Props) {
  const [countryCode, setCountryCode] = useState(initialCountryCode)
  const [phoneNumber, setPhoneNumber] = useState(initialPhone)
  const [message, setMessage] = useState(initialMessage)
  const [recentContacts, setRecentContacts] = useState<Contact[]>([])
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [hasContactPicker, setHasContactPicker] = useState(false)

  useEffect(() => {
    setHasContactPicker('contacts' in navigator)
  }, [])

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode)

  const handleDialKey = (key: string) => {
    if (key === '⌫') {
      setPhoneNumber((prev) => prev.slice(0, -1))
    } else {
      setPhoneNumber((prev) => prev + key)
    }
  }

  const handleSend = () => {
    if (!phoneNumber.trim()) return
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const fullPhone = `${countryCode}${cleanPhone}`
    const waUrl = `https://wa.me/${fullPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`

    const contact: Contact = { name: `+${fullPhone}`, phone: cleanPhone, countryCode }
    setRecentContacts((prev) => {
      const filtered = prev.filter((c) => c.phone !== cleanPhone)
      return [contact, ...filtered].slice(0, 5)
    })

    window.open(waUrl, '_blank')
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
          setPhoneNumber(cleanTel.replace(/^\+/, ''))
        }
      }
    } catch (err) {
      console.error('Contact picker error:', err)
    }
  }

  const handleRecentClick = (contact: Contact) => {
    setCountryCode(contact.countryCode)
    setPhoneNumber(contact.phone)
  }

  return (
    <div className="space-y-4">

      {/* ── Dialpad card ────────────────────────────────── */}
      <div className="card">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Número de WhatsApp
        </label>

        {/* Country selector + number display */}
        <div className="flex gap-2 mb-3">
          {/* Country code picker */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              className="input-field w-auto px-3 flex items-center gap-1 min-w-[80px] h-full"
            >
              <span>{selectedCountry?.flag}</span>
              <span className="text-sm">+{countryCode}</span>
              <span className="text-gray-400">▾</span>
            </button>

            {showCountryPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto w-64">
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCountryCode(c.code); setShowCountryPicker(false) }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      c.code === countryCode ? 'bg-whatsapp-light' : ''
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-gray-400 text-sm ml-auto">+{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Number display */}
          <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3 flex items-center min-h-[48px] overflow-hidden">
            {phoneNumber ? (
              <span className="text-xl font-mono tracking-widest text-gray-800 truncate">
                {phoneNumber}
              </span>
            ) : (
              <span className="text-base text-gray-400">Número</span>
            )}
          </div>
        </div>

        {/* Contact Picker API button */}
        {hasContactPicker && (
          <button
            onClick={handleContactPicker}
            className="mb-3 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-whatsapp-green text-whatsapp-teal text-sm font-medium active:bg-whatsapp-light transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
            </svg>
            Elegir contacto
          </button>
        )}

        {/* Dialpad grid */}
        <div className="grid grid-cols-3 gap-2">
          {DIAL_KEYS.map(({ digit, sub }) => {
            const isDelete = digit === '⌫'
            return (
              <button
                key={digit}
                onClick={() => handleDialKey(digit)}
                className={`
                  flex flex-col items-center justify-center
                  rounded-[10px] py-2 px-2
                  active:scale-95 transition-transform select-none
                  ${isDelete
                    ? 'bg-red-50 text-red-500 active:bg-red-100'
                    : 'bg-[#f7f7f7] text-gray-800 active:bg-gray-200'
                  }
                `}
              >
                <span className={`font-semibold leading-tight ${isDelete ? 'text-lg' : 'text-[16px]'}`}>
                  {digit}
                </span>
                {sub && (
                  <span className="text-[9px] text-gray-400 font-normal tracking-widest leading-none mt-0.5">
                    {sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Google Contacts ──────────────────────────────── */}
      <GoogleContacts
        onSelect={(phone, cc) => {
          setPhoneNumber(phone)
          setCountryCode(cc)
        }}
      />

      {/* ── Message card ────────────────────────────────── */}
      <div className="card">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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

      {/* ── Send button ──────────────────────────────────── */}
      <button
        onClick={handleSend}
        disabled={!phoneNumber.trim()}
        className="btn-primary w-full text-lg"
      >
        🚀 Ship it now!!
      </button>

      {/* ── Recent contacts ──────────────────────────────── */}
      {recentContacts.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recientes
          </p>
          <div className="space-y-2">
            {recentContacts.map((contact, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(contact)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-whatsapp-light flex items-center justify-center text-whatsapp-teal font-bold text-sm">
                  {contact.name[1]}
                </div>
                <span className="text-sm text-gray-700">{contact.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
