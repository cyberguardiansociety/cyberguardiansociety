import { DEFAULT_MAINTENANCE_MESSAGE, getMaintenanceSettings } from '@/lib/portal-settings'

export const dynamic = 'force-dynamic'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function maintenanceHtml(message: string, nonce: string) {
  const styleNonce = nonce ? ` nonce="${escapeHtml(nonce)}"` : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Maintenance in progress | Cyber Guardian Society</title>
    <style${styleNonce}>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #080b13; color: #f4f7ff; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 28px; background: radial-gradient(ellipse at 50% 0%, rgba(37, 99, 235, .18), transparent 55%), #080b13; }
      main { width: min(100%, 660px); padding: clamp(28px, 6vw, 56px); border: 1px solid rgba(96, 165, 250, .22); border-radius: 24px; background: rgba(14, 20, 34, .92); box-shadow: 0 32px 100px rgba(0, 0, 0, .42); text-align: center; }
      .mark { display: grid; place-items: center; width: 54px; height: 54px; margin: 0 auto 24px; border: 1px solid rgba(96, 165, 250, .34); border-radius: 17px; background: rgba(37, 99, 235, .13); color: #93c5fd; }
      .mark svg { width: 26px; height: 26px; }
      .eyebrow { margin: 0 0 12px; color: #93c5fd; font-size: 11px; font-weight: 750; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(30px, 6vw, 46px); letter-spacing: -.045em; line-height: 1.08; }
      .message { max-width: 490px; margin: 18px auto 0; color: #bac6db; font-size: 15px; line-height: 1.8; white-space: pre-line; overflow-wrap: anywhere; }
      .rule { width: 100%; height: 1px; margin: 30px 0 22px; background: rgba(148, 163, 184, .14); }
      .brand { margin: 0; color: #8794aa; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      @media (max-width: 480px) { body { padding: 16px; } main { border-radius: 18px; } }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 19 6v5.6c0 4.4-2.9 7.3-7 9-4.1-1.7-7-4.6-7-9V6l7-2.5Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 12.2 11 14l4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <p class="eyebrow">Cyber Guardian Society</p>
      <h1>We’ll be back soon</h1>
      <p class="message">${escapeHtml(message)}</p>
      <div class="rule"></div>
      <p class="brand">Secure Today. Stronger Tomorrow.</p>
    </main>
  </body>
</html>`
}

export async function GET(request: Request) {
  let message = DEFAULT_MAINTENANCE_MESSAGE
  try {
    const settings = await getMaintenanceSettings()
    if (!settings.enabled) return new Response('Not found', { status: 404 })
    message = settings.message
  } catch {
    // Keep the notice readable even if the settings store becomes unavailable.
  }

  const nonce = request.headers.get('x-nonce') ?? ''
  return new Response(maintenanceHtml(message, nonce), {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Retry-After': '300',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
