# Sellia Connect — CLAUDE.md

## Reglas obligatorias
1. ✅ Siempre terminar con "✅ Listo." + resumen de cambios + commit hash
2. 🎯 Scope estricto: NO tocar archivos fuera del scope pedido
3. 🔍 Siempre `npx tsc --noEmit` antes de cualquier commit
4. 🚀 Deploy: `npm run deploy` o push a main (auto-deploy en Vercel)
5. 🧪 No hay staging — las pruebas son en producción
6. 🔒 Nunca exponer secrets en código ni en logs

## Proyecto
- **Nombre:** Sellia Connect
- **URL:** https://wa.quick.sellia.ai
- **Repo:** https://github.com/cdgzkid-dotcom/wa-quick
- **Stack:** Next.js 14, MongoDB Atlas, Vercel Hobby, PWA
- **Health check:** `npm run health` (17/17 checks)
- **Tag estable:** `stable-v1` (commit `13c985f`)

## Infraestructura
- **Cron:** cron-job.org cada minuto → `/api/cron/check-messages` con `Authorization: Bearer waQuickSecret123`
- **DB:** MongoDB Atlas cluster1.ryqtobh.mongodb.net, usuario `cdgzkid_db_user`
- **Deploy:** Vercel Hobby (auto-deploy desde GitHub main)
- **OAuth redirect:** `https://wa.quick.sellia.ai/api/auth/google/callback`

## Variables de entorno (Vercel)
- `NEXT_PUBLIC_APP_URL` = `https://wa.quick.sellia.ai`
- `MONGODB_URI` = `mongodb+srv://cdgzkid_db_user:<password>@cluster1.ryqtobh.mongodb.net/`
- `CRON_SECRET` = `waQuickSecret123`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`

## Colecciones MongoDB
- `scheduledmessages` — mensajes programados pendientes/enviados
- `pendingdeeplinks` — deep links de notificaciones (TTL 60s)
- `pushsubscriptions` — suscripciones push por usuario
- `googleaccounts` — tokens OAuth de Google por sessionId

## Arquitectura de features

### Tema automático
- Dark: 7pm–8am | Light: 8am–7pm
- Clase `theme-dark` / `theme-light` en `<html>`
- CSS variables: `--bg`, `--card`, `--text`, `--accent` (#25D366), etc.

### Deep link desde notificaciones
- Cron guarda `PendingDeepLink` en MongoDB al enviar push
- `page.tsx` hace polling cada 3s a `/api/deeplink`
- Poll inmediato en `visibilitychange` y `focus`
- Al detectar: `setActiveTab('quick')` → `setDeepLink()` → form pre-cargado

### Google Contacts
- Aislamiento por `sessionId` (localStorage `qz_session_id`)
- OAuth flow: init → Google → callback → guarda token en `googleaccounts`
- Scope: `contacts.readonly` (app en modo prueba, max 100 test users)

### Push Notifications
- VAPID keys configuradas en Vercel
- Service worker: `worker/index.js`
- Suscripciones guardadas en `pushsubscriptions`

## Bugs resueltos (no reintroducir)
1. **iOS deep link** — usar polling servidor + visibilitychange, NO postMessage del SW
2. **datetime-local overflow iOS** — wrapper `overflow:hidden` + `width:calc(100%+1px)`
3. **Google Contacts sessionId** — cada dispositivo tiene su propio sessionId en localStorage
4. **MongoDB credentials** — contraseña sin caracteres especiales
5. **PendingDeepLink required field** — `subscriptionEndpoint` debe ser `default: ''` no `required: true`

## Comandos útiles
```bash
npm run health      # health check 17/17
npm run deploy      # deploy a producción
npx tsc --noEmit    # verificar TypeScript
git log --oneline -5
```
