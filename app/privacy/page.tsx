import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Quick Zap',
  description: 'Política de privacidad de Quick Zap',
}

export default function PrivacyPage() {
  const appUrl = 'https://wa-quick.vercel.app'
  const lastUpdated = '22 de febrero de 2026'

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-whatsapp-teal text-white px-6 py-5">
        <Link href="/" className="text-green-200 text-sm hover:text-white transition-colors">
          ← Volver a Quick Zap
        </Link>
        <h1 className="text-2xl font-bold mt-3">Política de Privacidad</h1>
        <p className="text-green-200 text-sm mt-1">Última actualización: {lastUpdated}</p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8 text-gray-700 leading-relaxed">

        <section>
          <p>
            Quick Zap (<strong>{appUrl}</strong>) es una aplicación web que permite enviar
            mensajes de WhatsApp sin necesidad de guardar el número como contacto, y programar
            recordatorios de envío. Esta política describe qué datos recopilamos, cómo los
            usamos y cómo los protegemos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Datos que recopilamos</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">Mensajes programados</h3>
              <p className="text-sm mt-1">
                Cuando programas un recordatorio, almacenamos el número de teléfono de destino,
                el mensaje opcional y la fecha/hora de envío. Estos datos se guardan en nuestra
                base de datos únicamente para poder notificarte en el momento programado.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Suscripciones push</h3>
              <p className="text-sm mt-1">
                Si activas las notificaciones push, guardamos el identificador de suscripción
                de tu navegador para poder enviarte la notificación en el momento programado.
                No contiene información personal identificable.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Contactos de Google (opcional)</h3>
              <p className="text-sm mt-1">
                Si conectas tu cuenta de Google, solicitamos acceso de solo lectura a tu agenda
                (scope <code className="bg-gray-100 px-1 rounded text-xs">contacts.readonly</code>).
                Usamos este permiso exclusivamente para mostrar tus contactos dentro de la app y
                facilitar la selección de un número de teléfono. <strong>No almacenamos, vendemos
                ni compartimos tu lista de contactos.</strong> Los contactos se leen en tiempo
                real desde la API de Google cada vez que abres la sección de contactos.
              </p>
              <p className="text-sm mt-2">
                Lo que sí guardamos de tu cuenta de Google: dirección de correo, nombre, foto de
                perfil y los tokens de acceso necesarios para consultar la API. Nunca leemos tu
                correo, calendario ni ningún otro dato fuera del scope autorizado.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Cómo usamos los datos</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Enviar notificaciones push en el momento que programaste.</li>
            <li>Mostrarte tu lista de contactos de Google para seleccionar un número rápidamente.</li>
            <li>No usamos los datos para publicidad, análisis de terceros ni ningún otro fin.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Retención y eliminación</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Los mensajes programados se eliminan automáticamente una vez enviada la notificación.</li>
            <li>
              Puedes desconectar tu cuenta de Google en cualquier momento desde la sección
              "Contactos de Google" → botón ×. Esto elimina inmediatamente el token de acceso
              y los datos de perfil de nuestra base de datos.
            </li>
            <li>
              También puedes revocar el acceso directamente desde tu cuenta de Google en{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-whatsapp-dark underline"
              >
                myaccount.google.com/permissions
              </a>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Compartición de datos</h2>
          <p className="text-sm">
            No vendemos, alquilamos ni compartimos tus datos personales con terceros. Los datos
            se almacenan en una base de datos MongoDB privada. El único tercero que interviene
            es Google (para la autenticación OAuth y la API de contactos), sujeto a su propia{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-whatsapp-dark underline"
            >
              política de privacidad
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Seguridad</h2>
          <p className="text-sm">
            Los tokens de acceso de Google se almacenan de forma segura y se usan exclusivamente
            para consultar la API de contactos en nombre del usuario. La comunicación entre la app
            y los servidores se realiza siempre a través de HTTPS.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Tus derechos</h2>
          <p className="text-sm">
            Puedes solicitar la eliminación de todos tus datos en cualquier momento escribiendo a
            la dirección de contacto indicada abajo. Responderemos en un plazo máximo de 30 días.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Contacto</h2>
          <p className="text-sm">
            Si tienes preguntas sobre esta política o quieres ejercer tus derechos, escríbenos a{' '}
            <a href="mailto:admin@wa-quick.app" className="text-whatsapp-dark underline">
              admin@wa-quick.app
            </a>.
          </p>
        </section>

      </main>
    </div>
  )
}
