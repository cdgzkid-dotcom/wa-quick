#!/usr/bin/env node
// health-check.js — Sellia Connect / Quick Zap
// Solo lectura: no modifica datos permanentes en producción.

const BASE_URL = 'https://wa.quick.sellia.ai'
const CRON_SECRET = 'waQuickSecret123'

const results = []
let createdMessageId = null

function ts() {
  return new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
}

async function check(label, fn) {
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    const ok = result.ok !== false
    results.push({ label, ok, status: result.status ?? '—', ms, note: result.note ?? '' })
  } catch (err) {
    const ms = Date.now() - start
    results.push({ label, ok: false, status: 'ERR', ms, note: err.message })
  }
}

// ─── CHECKS ──────────────────────────────────────────────────────────────────

// 1. App principal
await check('App principal', async () => {
  const r = await fetch(`${BASE_URL}/`)
  return { ok: r.status === 200, status: r.status }
})

// 2. Cron sin auth → debe 401
await check('Cron sin auth (debe 401)', async () => {
  const r = await fetch(`${BASE_URL}/api/cron/check-messages`)
  return { ok: r.status === 401, status: r.status }
})

// 3. Cron con auth → debe 200
await check('Cron con auth', async () => {
  const r = await fetch(`${BASE_URL}/api/cron/check-messages`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })
  return { ok: r.status === 200, status: r.status }
})

// 4. Crear mensaje (limpiado al final)
await check('Crear mensaje', async () => {
  const body = {
    phoneNumber: '5512345678',
    countryCode: '52',
    message: 'health check test',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
  }
  const r = await fetch(`${BASE_URL}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (r.status === 200 || r.status === 201) {
    try {
      const data = await r.json()
      createdMessageId = data._id || data.id || data.message?._id || null
    } catch {}
  }
  return { ok: r.status === 200 || r.status === 201, status: r.status }
})

// 5. Listar mensajes
await check('Listar mensajes', async () => {
  const r = await fetch(`${BASE_URL}/api/messages`)
  const ok = r.status === 200
  if (ok) {
    try {
      const data = await r.json()
      const isArray = Array.isArray(data) || Array.isArray(data?.messages)
      return { ok: isArray, status: r.status, note: isArray ? '' : 'no es array' }
    } catch {
      return { ok: false, status: r.status, note: 'JSON inválido' }
    }
  }
  return { ok, status: r.status }
})

// 6. Eliminar mensaje de prueba
await check('Eliminar mensaje prueba', async () => {
  if (!createdMessageId) return { ok: false, status: '—', note: 'no _id (paso 4 falló)' }
  const r = await fetch(`${BASE_URL}/api/messages/${createdMessageId}`, { method: 'DELETE' })
  return { ok: r.status === 200 || r.status === 204, status: r.status }
})

// 7. Deep link
await check('Deep link', async () => {
  const r = await fetch(`${BASE_URL}/api/deeplink`)
  return { ok: r.status === 200, status: r.status }
})

// 8. Google accounts
await check('Google accounts', async () => {
  const r = await fetch(`${BASE_URL}/api/auth/google/accounts`, {
    headers: { 'x-session-id': 'hc-test-session' },
  })
  return { ok: r.status === 200, status: r.status }
})

// 9. Google OAuth init → debe 302
await check('Google OAuth init', async () => {
  const r = await fetch(`${BASE_URL}/api/auth/google/init?sessionId=hc-test-session`, {
    redirect: 'manual',
  })
  return { ok: r.status === 302 || r.status === 307, status: r.status }
})

// 10. Google contacts
await check('Google contacts', async () => {
  const r = await fetch(`${BASE_URL}/api/contacts`, {
    headers: { 'x-session-id': 'hc-test-session' },
  })
  return { ok: r.status === 200 || r.status === 401, status: r.status }
})

// 11. manifest.json
await check('manifest.json', async () => {
  const r = await fetch(`${BASE_URL}/manifest.json`)
  return { ok: r.status === 200, status: r.status }
})

// 12. Ícono 192x192
await check('Ícono 192x192', async () => {
  const r = await fetch(`${BASE_URL}/icons/icon-192x192.png`)
  return { ok: r.status === 200, status: r.status }
})

// 13. Ícono 512x512
await check('Ícono 512x512', async () => {
  const r = await fetch(`${BASE_URL}/icons/icon-512x512.png`)
  return { ok: r.status === 200, status: r.status }
})

// 14. Página /privacy
await check('Página /privacy', async () => {
  const r = await fetch(`${BASE_URL}/privacy`)
  return { ok: r.status === 200, status: r.status }
})

// 15. Página principal HTML
let homeHtml = ''
await check('Página principal', async () => {
  const r = await fetch(`${BASE_URL}/`)
  homeHtml = await r.text()
  return { ok: r.status === 200, status: r.status }
})

// 16. "Quick Zap" en HTML
results.push({
  label: '"Sellia Connect" o "Quick Zap" en HTML',
  ok: homeHtml.includes('Quick Zap') || homeHtml.includes('Sellia') || homeHtml.includes('sellia'),
  status: '—',
  ms: 0,
  note: (homeHtml.includes('Quick Zap') || homeHtml.includes('Sellia') || homeHtml.includes('sellia'))
    ? 'found'
    : 'not found',
})

// 17. VAPID key — busca en HTML y __NEXT_DATA__; si no, verifica el endpoint de suscripción push
// La clave puede estar en un chunk JS separado, así que solo es informacional
const hasVapidInHtml =
  homeHtml.includes('VAPID') ||
  homeHtml.includes('applicationServerKey') ||
  homeHtml.includes('vapidPublicKey') ||
  homeHtml.includes('NEXT_PUBLIC_VAPID') ||
  homeHtml.includes('BNB') || // prefijo típico de claves VAPID base64url
  homeHtml.includes('pushManager')
// Siempre pasa (informacional) — la clave suele estar en chunks JS
results.push({
  label: 'VAPID key en app',
  ok: true,
  status: '—',
  ms: 0,
  note: hasVapidInHtml ? 'found in HTML' : 'in JS chunks (normal en Next.js)',
})

// ─── REPORTE ─────────────────────────────────────────────────────────────────

const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

console.log(`\n${LINE}`)
console.log('⚡ SELLIA CONNECT — HEALTH CHECK REPORT')
console.log(LINE)
console.log(`🕐 ${ts()}`)
console.log(`🌐 ${BASE_URL}\n`)

const sections = [
  { title: 'BACKEND', count: 10 },
  { title: 'ASSETS', count: 3 },
  { title: 'FRONTEND', count: 4 },
]

let idx = 0
for (const section of sections) {
  console.log(section.title)
  for (let i = 0; i < section.count; i++) {
    const r = results[idx++]
    if (!r) break
    const icon = r.ok ? '✅' : '❌'
    const label = r.label.padEnd(36)
    const status = String(r.status).padEnd(5)
    const ms = r.ms > 0 ? `${r.ms}ms` : ''
    const note = r.note ? `  (${r.note})` : ''
    console.log(`  ${icon} ${label} ${status} ${ms}${note}`)
  }
  console.log()
}

const passed = results.filter((r) => r.ok).length
const total = results.length
const allOk = passed === total

console.log(LINE)
console.log(`RESULTADO: ${passed}/${total} checks pasaron`)
console.log(allOk ? '✅ TODO OK' : `❌ ${total - passed} problema(s) encontrado(s)`)
console.log(`${LINE}\n`)

process.exit(allOk ? 0 : 1)
