# Sellia Connect — CLAUDE.md

## Reglas obligatorias
1. ✅ Siempre terminar con "✅ Listo." + resumen de cambios + commit hash
2. 🎯 Scope estricto: NO tocar archivos fuera del scope pedido
3. 🔍 Siempre `npx tsc --noEmit` antes de cualquier commit
4. 🚀 Deploy: `npm run deploy` o push a main (auto-deploy en Vercel)
5. 🧪 No hay staging — las pruebas son en producción
6. 🔒 Nunca exponer secrets en código ni en logs
7. 🚫 **NUNCA correr nada en local** — ni `npm run dev`, ni `next dev`, ni ningún servidor local. Todo se prueba directo en producción vía push a main → Vercel auto-deploy. Correr en local causa conflictos con variables de entorno, OAuth redirects, service workers y PWA que solo funcionan en el dominio de producción. Si cualquier agente intenta correr un servidor local, detenlo inmediatamente.

## Proyecto
* **Nombre:** Sellia Connect
* **URL:** https://wa.quick.sellia.ai
* **Repo:** https://github.com/cdgzkid-dotcom/wa-quick
* **Stack:** Next.js 14, MongoDB Atlas, Vercel Hobby, PWA
* **Health check:** `npm run health` (17/17 checks)
* **Tag estable:** `stable-v1` (commit `13c985f`)

## Infraestructura
* **Cron:** cron-job.org cada minuto → `/api/cron/check-messages` con `Authorization: Bearer waQuickSecret123`
* **DB:** MongoDB Atlas cluster0.iamhat3.mongodb.net, base `wa_quick`, usuario `cdgzkid_db_user`
  * ⚠️ `Cluster0` es COMPARTIDO con otras apps (`qbtracker`, `qb_tracker_pro`, `subscan`). Por eso la URI nombra la base `wa_quick` explícitamente. No borrar el cluster.
  * El free tier permite un solo M0 por proyecto Atlas, así que no se puede crear otro cluster aparte.
* **Deploy:** Vercel Hobby (auto-deploy desde GitHub main)
* **OAuth redirect:** `https://wa.quick.sellia.ai/api/auth/google/callback`

## Variables de entorno (Vercel)
* `NEXT_PUBLIC_APP_URL` = `https://wa.quick.sellia.ai`
* `MONGODB_URI` = `mongodb+srv://cdgzkid_db_user:<password>@cluster0.iamhat3.mongodb.net/wa_quick?retryWrites=true&w=majority`
* `CRON_SECRET` = `waQuickSecret123`
* `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
* `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`

## Colecciones MongoDB
* `scheduledmessages` — mensajes programados pendientes/enviados
* `pendingdeeplinks` — deep links de notificaciones (TTL 60s)
* `pushsubscriptions` — suscripciones push por usuario
* `googleaccounts` — tokens OAuth de Google por sessionId

## Arquitectura de features

### Tema automático
* Dark: 7pm–8am | Light: 8am–7pm
* Clase `theme-dark` / `theme-light` en `<html>`
* CSS variables: `--bg`, `--card`, `--text`, `--accent` (#25D366), etc.

### Tap de la notificación → WhatsApp directo (SW 3.14.0)
* El tap del cuerpo y el botón "📤 Enviar ahora" hacen lo mismo:
  `clients.openWindow(wa.me/...)` desde el contexto de gesto de
  `notificationclick`, que es lo que hace que iOS 16.4+ intercepte el
  universal link en vez de abrir Safari.
* `buildWaUrl()` prefiere el `waUrl` que ya arma el cron; lo reconstruye desde
  `countryCode`/`phone`/`message` solo si falta (notificaciones viejas).
* Si `openWindow` rechaza **o resuelve `null`**, cae al deep link de abajo.
  Se usa `then(onFulfilled, onRejected)` de dos argumentos a propósito:
  encadenar `.catch()` reintentaría el fallback dos veces.

### Deep link desde notificaciones (fallback — NO borrar)
* Es el respaldo cuando `openWindow(wa.me)` falla. Sigue siendo la ruta
  segura en iOS y está protegida por el bug #1.
* Cron guarda `PendingDeepLink` en MongoDB **antes** de enviar el push
  (evita el race si Vercel corta la función), y lo borra si ninguna
  suscripción aceptó el envío.
* `GET /api/deeplink` solo hace *peek*; `PATCH` es quien lo marca usado.
  Solo considera registros de los últimos 3 minutos.
* `page.tsx` hace polling a `/api/deeplink` (cada 1s en el código, no 3s)
* Poll inmediato en `visibilitychange` y `focus`

### Google Contacts
* Aislamiento por `sessionId` (localStorage `qz_session_id`)
* OAuth flow: init → Google → callback → guarda token en `googleaccounts`
* Scope: `contacts.readonly` (app en modo prueba, max 100 test users)

### Push Notifications
* VAPID keys configuradas en Vercel
* **Service worker activo: `public/sw-custom.js`** — lo registra `page.tsx`
  a mano. `next.config.js` tiene `register: false` para que no compitan dos SWs.
  ⚠️ `worker/index.js` y `public/sw.js` son **código muerto**: nunca se
  registran. Editarlos no tiene ningún efecto. Lo mismo con el componente
  `PushNotifications.tsx`, que no está importado en ningún lado — la única UI
  de push es `BellButton.tsx`.
* Al bumpear el SW hay que subir `SW_VERSION` o iOS se queda con el viejo.
* Suscripciones guardadas en `pushsubscriptions`
* **Reconciliación al arrancar:** si `getSubscription()` devuelve algo,
  `BellButton` hace POST a `/api/push/subscribe` de todas formas. La ruta hace
  `upsert` por endpoint, así que repetirlo es inofensivo. Ver bug #7.

### Cron de mensajes
* Lo dispara **cron-job.org** cada minuto con `Authorization: Bearer`.
  Vercel Hobby NO puede correrlo (`vercel.json` no debe tener `crons`).
* La query **no tiene cota inferior**: basta `scheduledAt <= ahora`. Ver bug #8.
* `notified` es el candado contra duplicados; el cron lo marca de forma atómica
  **antes** de revisar suscripciones, así que un mensaje puede quedar en
  `notified:true` aunque no se haya enviado ningún push.
* ⚠️ `page.tsx` llama a `/api/cron/check-messages` cada 60s **sin auth** →
  siempre 401. Es ruido inútil; el secreto no puede vivir en el cliente.

## ⚠️ Entorno de desarrollo — Solo producción

**No existe entorno local.** Todo el flujo de desarrollo es:
1. Editar código (Claude Code o GitHub)
2. Commit + push a `main`
3. Vercel auto-deploy en ~30s
4. Probar en https://wa.quick.sellia.ai

**¿Por qué no local?**
* OAuth redirects apuntan al dominio de producción — en local fallan
* Service workers y push notifications requieren HTTPS con el dominio correcto
* Las variables de entorno viven en Vercel, no hay `.env.local`
* PWA manifest, scope y start_url están hardcodeados al dominio de producción
* Evita el clásico "funciona en local pero no en prod" — si funciona, funciona

**Si Claude Code o cualquier agente intenta correr `npm run dev` o `next dev`, detenlo inmediatamente.**

## Bugs resueltos (no reintroducir)
1. **iOS deep link** — usar polling servidor + visibilitychange, NO postMessage del SW
2. **datetime-local overflow iOS** — wrapper `overflow:hidden` + `width:calc(100%+1px)`
3. **Google Contacts sessionId** — cada dispositivo tiene su propio sessionId en localStorage
4. **MongoDB credentials** — contraseña sin caracteres especiales
5. **PendingDeepLink required field** — `subscriptionEndpoint` debe ser `default: ''` no `required: true`
6. **Atlas M0 borra clusters inactivos (~60 días)** — `cluster1` murió así el 2026-06-20. Se perdió toda la data (mensajes, tokens de Google, suscripciones push). El cron escribe un heartbeat diario en la colección `heartbeats` para que Atlas registre actividad. ⚠️ Ojo: el cron conectaba cada minuto hasta el día que murió, así que la inactividad no explica del todo lo que pasó — trátalo como hipótesis, no como causa probada.
7. **Suscripción push desincronizada navegador ↔ DB** — la suscripción vive en dos lados. Si se pierde la fila de `pushsubscriptions` (pasó al morir el cluster), el navegador sigue creyéndose suscrito y `BellButton` se pinta activo, así que tocarlo **desuscribe** en vez de re-registrar. Nadie reenviaba la suscripción existente. Fix: POST idempotente en cada arranque. No quitarlo.
8. **Ventana del cron sin cota inferior** — era `[ahora−2min, ahora]`, así que cualquier hueco del scheduler mayor a 2 min varaba el mensaje en `notified:false` **para siempre**. Ahora basta `scheduledAt <= ahora`. Efecto secundario aceptado: tras una caída larga, todos los pendientes se notifican de golpe al volver.
9. **Diagnosticar el cron por código de respuesta, no por conteo** — un 401 en `/api/cron/check-messages` puede venir de cron-job.org sin su header `Authorization`, o del `setInterval` sin auth de `page.tsx`. Para distinguirlos: cierra la PWA por completo; si los 401 continúan, es cron-job.org.

## Comandos útiles
```bash
npm run health      # health check 17/17
npm run deploy      # deploy a producción
npx tsc --noEmit    # verificar TypeScript
git log --oneline -5
```
