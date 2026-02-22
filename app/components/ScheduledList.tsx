'use client'

import { useState, useEffect, useCallback } from 'react'

type ScheduledMessage = {
  id: string
  phoneNumber: string
  countryCode: string
  message: string
  scheduledAt: string
  sent: boolean
  notified: boolean
  createdAt: string
}

type EditingState = {
  id: string
  message: string
  scheduledAt: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getTimeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return 'Pasado'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `en ${days}d ${hours % 24}h`
  if (hours > 0) return `en ${hours}h ${minutes % 60}m`
  return `en ${minutes}m`
}

export default function ScheduledList({ refreshKey }: { refreshKey: number }) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'sent' | 'all'>('pending')

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages, refreshKey])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este recordatorio?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSendNow = (msg: ScheduledMessage) => {
    const fullPhone = `${msg.countryCode}${msg.phoneNumber}`
    const waUrl = `https://wa.me/${fullPhone}${msg.message ? `?text=${encodeURIComponent(msg.message)}` : ''}`
    window.open(waUrl, '_blank')
  }

  const startEdit = (msg: ScheduledMessage) => {
    const local = new Date(msg.scheduledAt).toISOString().slice(0, 16)
    setEditing({ id: msg.id, message: msg.message, scheduledAt: local })
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/messages/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: editing.message,
          scheduledAt: new Date(editing.scheduledAt).toISOString(),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setMessages((prev) => prev.map((m) => (m.id === editing.id ? updated : m)))
        setEditing(null)
      }
    } catch (err) {
      console.error('Edit error:', err)
    } finally {
      setSavingEdit(false)
    }
  }

  const filtered = messages.filter((m) => {
    if (filter === 'pending') return !m.sent
    if (filter === 'sent') return m.sent
    return true
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="card !p-1 flex gap-1">
        {(['pending', 'sent', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-whatsapp-green text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {f === 'pending' ? 'Pendientes' : f === 'sent' ? 'Enviados' : 'Todos'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">
            {filter === 'pending' ? '📭' : filter === 'sent' ? '✅' : '📬'}
          </div>
          <p className="text-gray-500 font-medium">
            {filter === 'pending'
              ? 'No tienes recordatorios pendientes'
              : filter === 'sent'
              ? 'No hay mensajes enviados aún'
              : 'No hay mensajes programados'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'pending' && 'Ve a "Programar" para crear uno'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <div key={msg.id} className="card relative overflow-hidden">
              {/* Status indicator */}
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  msg.sent ? 'bg-whatsapp-green' : 'bg-yellow-400'
                }`}
              />

              {editing?.id === msg.id ? (
                // Edit mode
                <div className="space-y-3 pl-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Editando</p>
                  <textarea
                    value={editing.message}
                    onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                    className="input-field resize-none text-sm"
                    rows={2}
                    placeholder="Mensaje..."
                  />
                  <input
                    type="datetime-local"
                    value={editing.scheduledAt}
                    onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value })}
                    className="input-field text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="btn-primary flex-1 py-2 text-sm"
                    >
                      {savingEdit ? 'Guardando...' : '✓ Guardar'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="btn-secondary flex-1 py-2 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="pl-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-sm">
                          +{msg.countryCode} {msg.phoneNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            msg.sent
                              ? 'bg-whatsapp-light text-whatsapp-dark'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {msg.sent ? '✓ Notificado' : getTimeUntil(msg.scheduledAt)}
                        </span>
                      </div>

                      {msg.message && (
                        <p className="text-sm text-gray-600 truncate mb-1">
                          "{msg.message}"
                        </p>
                      )}

                      <p className="text-xs text-gray-400">
                        📅 {formatDate(msg.scheduledAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSendNow(msg)}
                      className="flex-1 bg-whatsapp-light text-whatsapp-teal text-xs font-semibold py-2 px-3 rounded-xl active:bg-whatsapp-green active:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                      Enviar ahora
                    </button>

                    {!msg.sent && (
                      <button
                        onClick={() => startEdit(msg)}
                        className="text-gray-400 hover:text-whatsapp-teal p-2 rounded-xl hover:bg-gray-50 transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      className="text-red-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      {deletingId === msg.id ? (
                        <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={fetchMessages}
        className="w-full text-sm text-gray-400 py-2 flex items-center justify-center gap-2 hover:text-whatsapp-teal transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        Actualizar lista
      </button>
    </div>
  )
}
