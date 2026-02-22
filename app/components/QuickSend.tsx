'use client'

import { useState } from 'react'

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
  { code: '49', flag: '🇩🇪', name: 'Alemania' },
  { code: '33', flag: '🇫🇷', name: 'Francia' },
  { code: '39', flag: '🇮🇹', name: 'Italia' },
  { code: '81', flag: '🇯🇵', name: 'Japón' },
  { code: '86', flag: '🇨🇳', name: 'China' },
]

type Contact = {
  name: string
  phone: string
  countryCode: string
}

export default function QuickSend() {
  const [countryCode, setCountryCode] = useState('52')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [recentContacts, setRecentContacts] = useState<Contact[]>([])
  const [showCountryPicker, setShowCountryPicker] = useState(false)

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode)

  const handleSend = () => {
    if (!phoneNumber.trim()) return

    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const fullPhone = `${countryCode}${cleanPhone}`
    const waUrl = `https://wa.me/${fullPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`

    // Save to recent
    const contact: Contact = {
      name: `+${fullPhone}`,
      phone: cleanPhone,
      countryCode,
    }
    setRecentContacts((prev) => {
      const filtered = prev.filter((c) => c.phone !== cleanPhone)
      return [contact, ...filtered].slice(0, 5)
    })

    window.open(waUrl, '_blank')
  }

  const handleContactPicker = async () => {
    if (!('contacts' in navigator)) {
      alert('Tu navegador no soporta el selector de contactos. Prueba en Chrome para Android.')
      return
    }

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
        // Parse phone number - remove spaces, dashes, parentheses
        const cleanTel = tel.replace(/[\s\-\(\)]/g, '')

        // Try to extract country code
        if (cleanTel.startsWith('+')) {
          const num = cleanTel.slice(1)
          // Try to match known country codes (longest first)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="space-y-4">
      {/* Phone input */}
      <div className="card">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Número de WhatsApp
        </label>

        <div className="flex gap-2">
          {/* Country code selector */}
          <div className="relative">
            <button
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              className="input-field w-auto px-3 flex items-center gap-1 min-w-[80px]"
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
                    <span className="text-gray-400 text-sm ml-auto">+{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone number input */}
          <div className="flex-1 flex gap-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="1234567890"
              className="input-field flex-1"
              inputMode="tel"
            />

            {/* Contact picker button */}
            {'contacts' in navigator && (
              <button
                onClick={handleContactPicker}
                className="input-field w-auto px-3 text-whatsapp-teal"
                title="Seleccionar contacto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Optional message */}
        <div className="mt-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje (opcional)..."
            rows={3}
            className="input-field resize-none"
          />
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!phoneNumber.trim()}
        className="btn-primary w-full text-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 16.938c-.26.733-.948 1.345-1.687 1.572-.548.17-1.256.207-2.022.042-.468-.101-1.054-.294-1.8-.617-3.298-1.432-5.447-4.74-5.612-4.964-.163-.22-1.315-1.748-1.315-3.33 0-1.58.83-2.356 1.123-2.678.293-.322.64-.403.854-.403.214 0 .428.002.615.01.197.01.462-.075.723.552.273.656.924 2.259.998 2.421.074.162.124.352.025.567-.099.214-.149.348-.298.537l-.446.517c-.147.17-.3.354-.13.694.173.34.77 1.27 1.65 2.057 1.134 1.009 2.089 1.32 2.384 1.47.297.148.47.124.644-.075.174-.198.743-.87.942-1.168.197-.298.395-.248.666-.149.27.1 1.73.817 2.027.967.297.149.495.223.57.347.073.124.073.72-.187 1.453z"/>
        </svg>
        Abrir WhatsApp
      </button>

      {/* Recent contacts */}
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

      {/* Contact picker hint */}
      {!('contacts' in navigator) && (
        <p className="text-xs text-center text-gray-400">
          💡 El selector de contactos está disponible en Chrome para Android
        </p>
      )}
    </div>
  )
}
