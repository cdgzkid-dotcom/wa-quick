import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/app/lib/mongoose'
import PendingDeepLink from '@/app/lib/models/PendingDeepLink'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone') || ''
  const text  = searchParams.get('text')  || ''

  if (!phone) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Consume pending deeplinks so the app doesn't re-show the banner after WhatsApp opens
  try {
    await connectDB()
    await PendingDeepLink.updateMany(
      { createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, used: false },
      { used: true }
    )
  } catch {
    // best effort
  }

  const waScheme = `whatsapp://send?phone=${encodeURIComponent(phone)}${text ? `&text=${text}` : ''}`
  const waFallback = `https://wa.me/${phone}${text ? `?text=${text}` : ''}`

  // Return an HTML page that immediately redirects to whatsapp://
  // Both <meta refresh> and window.location.replace are used for max compatibility.
  // The page was opened by clients.openWindow() triggered by a notification tap (user gesture),
  // so WKWebView should follow the custom-scheme redirect.
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${waScheme}">
  <title>Abriendo WhatsApp…</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #111827; color: #fff;
      font-family: -apple-system, sans-serif; text-align: center; padding: 24px;
    }
    .icon { font-size: 56px; margin-bottom: 16px; }
    p { font-size: 16px; color: #9ca3af; margin-bottom: 24px; }
    a {
      display: inline-block; padding: 14px 28px; border-radius: 999px;
      background: #25D366; color: #fff; font-size: 16px; font-weight: 600;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div>
    <div class="icon">💬</div>
    <p>Abriendo WhatsApp…</p>
    <a href="${waScheme}" id="btn">Toca aquí si no abre</a>
  </div>
  <script>
    window.location.replace('${waScheme}');
    // Fallback: after 3s redirect to wa.me (in case whatsapp:// didn't open)
    setTimeout(function() {
      window.location.replace('${waFallback}');
    }, 3000);
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
