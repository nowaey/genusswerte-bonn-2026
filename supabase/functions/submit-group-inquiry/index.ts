import { corsHeaders } from '../_shared/cors.ts'

/* =========================================================
   SUBMIT-GROUP-INQUIRY
   Nimmt Anfragen aus dem Formular auf gruppen-events.html
   entgegen und schickt sie per Resend an die Genusswerte-
   Mailbox — Reply-To ist die Absender-Adresse, damit direkt
   geantwortet werden kann.

   Kein DB-Schreibvorgang, keine Speicherung — nur Weiterleitung
   per E-Mail. Passend zum aktuell pausierten Buchungssystem
   (siehe PROJECT_CONTEXT.md).
   ========================================================= */

const NOTIFY_TO = 'info@genusswerte-bonn.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      name,
      email,
      phone,
      occasion,
      persons,
      preferred_date,
      message,
    } = await req.json()

    if (!name || !email || !occasion || !persons || !message) {
      return json({ error: 'MISSING_FIELDS' }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'INVALID_EMAIL' }, 400)
    }
    const personsNum = Number(persons)
    if (!Number.isInteger(personsNum) || personsNum < 1 || personsNum > 500) {
      return json({ error: 'INVALID_PERSONS' }, 400)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('submit-group-inquiry: RESEND_API_KEY fehlt')
      return json({ error: 'INTERNAL_ERROR' }, 500)
    }

    const esc = (s: string) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const html = `
<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1A1A1A;line-height:1.6;">
  <h2 style="font-family:Georgia,serif;color:#2D4A3E;margin:0 0 16px;">Neue Gruppen-/Event-Anfrage</h2>
  <table style="border-collapse:collapse;width:100%;max-width:480px;">
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Name</td><td style="padding:6px 0;"><strong>${esc(name)}</strong></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">E-Mail</td><td style="padding:6px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Telefon</td><td style="padding:6px 0;">${phone ? esc(phone) : '&ndash;'}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Anlass</td><td style="padding:6px 0;">${esc(occasion)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Personen</td><td style="padding:6px 0;">${personsNum}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B6B6B;">Wunschtermin</td><td style="padding:6px 0;">${preferred_date ? esc(preferred_date) : '&ndash;'}</td></tr>
  </table>
  <p style="color:#6B6B6B;margin:20px 0 4px;">Nachricht</p>
  <p style="white-space:pre-wrap; border-left:3px solid #C9A96E; padding-left:12px; margin:0;">${esc(message)}</p>
  <p style="color:#9A9A9A; font-size:12px; margin-top:24px;">Gesendet über das Formular auf gruppen-events.html — Antwort geht direkt an ${esc(email)}.</p>
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
        subject: `Gruppenanfrage: ${occasion} für ${personsNum} Personen`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('submit-group-inquiry: Resend error', err)
      return json({ error: 'SEND_FAILED' }, 502)
    }

    return json({ success: true })
  } catch (err) {
    console.error('submit-group-inquiry error:', err)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
