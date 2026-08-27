import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

/* =========================================================
   SUBMIT-GIFTBOX-INQUIRY
   Nimmt Anfragen aus dem Formular auf geschenkboxen.html
   entgegen und schickt sie per Resend an die Genusswerte-
   Mailbox — Reply-To ist die Absender-Adresse, damit direkt
   geantwortet werden kann.

   Fast identisch zu submit-group-inquiry (bewusst — gleiches,
   bereits bewährtes Muster: gleiche Rate-Limit-Funktion aus
   migrations/013_rate_limiting.sql, nur eigener bucket_key-Präfix,
   kein neues DB-Objekt nötig).
   ========================================================= */

const NOTIFY_TO = 'info@genusswerte-bonn.com'

// Gleiche Überlegung wie bei submit-group-inquiry: ohne Schranke waere
// dieser Endpunkt ein offenes Tor fuer Spam-E-Mails auf unser Resend-
// Kontingent. 8 Anfragen pro IP und Stunde reicht echten Nutzern.
const RATE_LIMIT_MAX = 8
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

Deno.serve(async (req) => {
  // Pro Request neu berechnet — sonst koennten sich bei gleichzeitigen
  // Anfragen unterschiedlicher Herkunft die Origin-Header vermischen.
  const cors = getCorsHeaders(req.headers.get('origin'))
  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_bucket_key: `giftbox-inquiry:${clientIp(req)}`,
      p_max_hits: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    })
    // Bei einem Fehler beim Rate-Limit-Check selbst lieber durchlassen
    // als den ganzen Endpunkt lahmzulegen — Zusatzschutz, keine Kernfunktion.
    if (!rateLimitError && allowed === false) {
      return json({ error: 'RATE_LIMITED' }, 429)
    }

    const {
      name,
      email,
      phone,
      occasion,
      budget,
      message,
    } = await req.json()

    if (!name || !email || !message) {
      return json({ error: 'MISSING_FIELDS' }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'INVALID_EMAIL' }, 400)
    }
    // Laenge deckeln — verhindert ueberdimensionierte Eingaben (E-Mail-Groesse, Missbrauch).
    if (name.length > 200 || email.length > 200
        || (occasion && String(occasion).length > 200)
        || (budget && String(budget).length > 100)
        || (phone && String(phone).length > 60)
        || message.length > 5000) {
      return json({ error: 'MISSING_FIELDS' }, 400)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('submit-giftbox-inquiry: RESEND_API_KEY fehlt')
      return json({ error: 'INTERNAL_ERROR' }, 500)
    }

    const esc = (s: string) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const html = `
<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1A1A1A;line-height:1.6;">
  <h2 style="font-family:Georgia,serif;color:#2D4A3E;margin:0 0 16px;">Neue Geschenkbox-Anfrage</h2>
  <table style="border-collapse:collapse;width:100%;max-width:480px;">
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Name</td><td style="padding:6px 0;"><strong>${esc(name)}</strong></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">E-Mail</td><td style="padding:6px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Telefon</td><td style="padding:6px 0;">${phone ? esc(phone) : '&ndash;'}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Anlass</td><td style="padding:6px 0;">${occasion ? esc(occasion) : '&ndash;'}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Preisvorstellung</td><td style="padding:6px 0;">${budget ? esc(budget) : '&ndash;'}</td></tr>
  </table>
  <p style="color:#6B6B6B;margin:20px 0 4px;">Wünsche</p>
  <p style="white-space:pre-wrap; border-left:3px solid #C9A96E; padding-left:12px; margin:0;">${esc(message)}</p>
  <p style="color:#9A9A9A; font-size:12px; margin-top:24px;">Gesendet über das Formular auf geschenkboxen.html — Antwort geht direkt an ${esc(email)}.</p>
</div>`.trim()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Genusswerte Bonn Website <gutscheine@genusswerte-bonn.com>',
        to: [NOTIFY_TO],
        reply_to: email,
        subject: `Geschenkbox-Anfrage von ${name}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('submit-giftbox-inquiry: Resend error', err)
      return json({ error: 'SEND_FAILED' }, 502)
    }

    return json({ success: true })
  } catch (err) {
    console.error('submit-giftbox-inquiry error:', err)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
