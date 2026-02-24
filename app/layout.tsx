import type { Metadata, Viewport } from 'next'
import { Space_Mono, DM_Sans } from 'next/font/google'
import './globals.css'

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Inline theme-detection script — runs synchronously before paint to avoid FOUC.
// Night = 7 pm (19h) – 8 am. Fallback: prefers-color-scheme (handled via CSS).
const themeScript = `(function(){try{var h=new Date().getHours();document.documentElement.classList.add(h<8||h>=19?'theme-dark':'theme-light')}catch(e){}})()`

export const metadata: Metadata = {
  title: 'Sellia Connect',
  description: 'Envía mensajes de WhatsApp sin guardar contactos y programa recordatorios',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sellia Connect',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'Sellia Connect',
    description: 'Envía WhatsApp rápido sin guardar contactos',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B2A62',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceMono.variable} ${dmSans.variable}`}>
      <head>
        {/* Theme detection — must run before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="google-site-verification" content="y-4xO2de01waw1QxnP86oMOvcKK0cl_AsYGaUG6s3rs" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  )
}
