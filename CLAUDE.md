# Sellia Connect — Instrucciones para Claude Code

## Regla #1 — Cierre obligatorio de cada tarea
Después de cada tarea SIEMPRE escribe "✅ Listo." en tu respuesta.

## Regla #2 — Scope estricto
- NO tocar archivos que no sean necesarios para la tarea pedida
- NO cambiar estilos, componentes ni lógica fuera del scope pedido
- Siempre hacer `npx tsc --noEmit` antes de commit
- **Las pruebas se hacen en producción** (no hay entorno de staging)

## Proyecto
- **Nombre**: Sellia Connect
- **URL producción**: https://wa.quick.sellia.ai
- **Repo**: https://github.com/cdgzkid-dotcom/wa-quick
- **Dominio**: `wa.quick.sellia.ai` — CNAME en DNS apuntando a Vercel (`cname.vercel-dns.com`)

## Stack
- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, PWA
- **Base de datos**: MongoDB Atlas
- **Deploy**: Vercel (Hobby plan)
- **Fuente de estilos**: Tailwind CSS + CSS variables en `globals.css`
- **Service Worker**: `public/sw-custom.js` versión 2.0.0

## Deploy
```bash
npm run deploy
```
Equivale a: `git push origin main && export $(cat .env.deploy | xargs) && npx vercel deploy --prod --token=$VERCEL_TOKEN`

- `.env.deploy` contiene `VERCEL_TOKEN` (gitignoreado, nunca en git)
- El token también está en `~/.zshenv`

## Variables de entorno clave (Vercel)
- `NEXT_PUBLIC_APP_URL` = `https://wa.quick.sellia.ai` (sin espacios, sin trailing slash)
- `MONGODB_URI` = URI de MongoDB Atlas
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = OAuth de Google Cloud Console

## Google OAuth
- **Proyecto GCP**: "QuickZap"
- **Authorized redirect URI**: `https://wa.quick.sellia.ai/api/auth/google/callback`
- **Cookie**: `google_oauth_state` con `domain: '.sellia.ai'` en producción
- **Estado**: verificación de dominio enviada a Google, pendiente de aprobación

## Cron
- **Proveedor**: cron-job.org (externo, no Vercel — Hobby plan no soporta crons frecuentes)
- **Frecuencia**: cada 1 minuto
- **Endpoint**: `https://wa.quick.sellia.ai/api/cron/check-messages`
- `vercel.json` está vacío `{}` — el cron NO está en Vercel

## Tema (dark/light)
- **Dark mode**: 7pm – 8am (`h >= 19 || h < 8`)
- **Day mode**: 8am – 7pm (`h >= 8 && h < 19`)
- Lógica en `app/layout.tsx` → `themeScript` (inline script en `<head>`)

## Deeplink (polling)
- Polling en `app/page.tsx` cada **1 segundo** (`setInterval`)
- Poll inmediato al montar y al recuperar foco (`visibilitychange`)
- Retries adicionales en visibilitychange: +500ms, +1s, +2s, +3s
- Ventana de deeplink válida: **60 segundos** desde creación
- Al detectar deeplink: `setDeepLink` + `window.location.href` → WhatsApp

## Colecciones MongoDB principales
- `scheduledmessages` — mensajes programados
- `pendingdeeplinks` — deeplinks generados por cron (`used: false` = pendiente)
- `contacts` — contactos del usuario
- `pushsubscriptions` — suscripciones Web Push

## Git
```bash
# Push normal (sin deploy)
git push origin main

# Tag estable actual
git tag stable-v1   # apunta a commit 13c985f
```
