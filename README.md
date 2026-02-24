# WA Quick 📱

PWA para enviar mensajes de WhatsApp sin guardar contactos y programar recordatorios con notificaciones push.

## Características

- **Envío rápido** — Abre WhatsApp con cualquier número sin guardarlo en contactos
- **Mensajes programados** — Guarda recordatorios para enviar a una hora específica
- **Notificaciones Push** — Alertas automáticas cuando llega la hora de enviar
- **Contact Picker** — Selecciona contactos directamente desde tu teléfono (Chrome Android)
- **PWA** — Instálable como app en móviles, funciona offline

## Stack

- **Next.js 14** App Router + TypeScript
- **MongoDB** + Mongoose
- **Tailwind CSS** (tema verde WhatsApp, mobile-first)
- **Web Push API** (`web-push`)
- **next-pwa** para manifest y service worker

## Requisitos

- Node.js 18+
- MongoDB (local o [Atlas](https://mongodb.com/atlas))

## Setup rápido

### 1. Instalar dependencias

```bash
cd wa-quick
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
# MongoDB local o Atlas
MONGODB_URI="mongodb://localhost:27017/wa_quick"
# mongodb+srv://user:pass@cluster.mongodb.net/wa_quick

# Web Push (genera con el comando de abajo)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:tu@email.com"

# Protege el endpoint del cron
CRON_SECRET="secreto-aleatorio"
```

### 3. Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

Pega las claves en `.env.local`.

### 4. Generar íconos PWA (opcional)

```bash
npm install sharp
node scripts/generate-icons.js
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

> MongoDB se conecta automáticamente al primer request. No hay migraciones.

## Cron Job (notificaciones)

El endpoint `/api/cron/check-messages` se debe llamar cada minuto.

### En Vercel

Crea `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/check-messages", "schedule": "* * * * *" }]
}
```

### Servidor propio

```bash
* * * * * curl -H "x-cron-secret: TU_SECRET" https://tu-dominio.com/api/cron/check-messages
```

> En desarrollo, la app llama al cron automáticamente desde el cliente.

## Estructura

```
wa-quick/
├── app/
│   ├── api/
│   │   ├── messages/              # GET + POST
│   │   ├── messages/[id]/         # DELETE + PUT
│   │   ├── push/subscribe/        # Suscripciones push
│   │   └── cron/check-messages/   # Verificar y notificar
│   ├── components/
│   │   ├── QuickSend.tsx
│   │   ├── ScheduleMessage.tsx
│   │   ├── ScheduledList.tsx
│   │   └── PushNotifications.tsx
│   └── lib/
│       ├── mongoose.ts            # Conexión MongoDB singleton
│       ├── webpush.ts
│       └── models/
│           ├── ScheduledMessage.ts
│           └── PushSubscription.ts
├── public/
│   ├── manifest.json
│   ├── sw-custom.js
│   └── icons/
└── worker/index.js                # Push handler para next-pwa
```

<!-- Updated: Feb 2026 — rebranded to Sellia Connect -->

## Variables en Vercel

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | URI de MongoDB Atlas |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `VAPID_SUBJECT` | `mailto:tu@email.com` |
| `CRON_SECRET` | Secreto para el endpoint cron |


