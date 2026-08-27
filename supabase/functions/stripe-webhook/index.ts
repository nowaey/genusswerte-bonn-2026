import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Logo wird als E-Mail-ANHANG mit Content-ID mitgeschickt (nicht als
// eingebettetes Data-URI im <img>, das blockiert Gmail häufig; und nicht
// als Link auf die Website, solange die live Seite noch die alte Version
// ohne diese Datei ist). Referenziert im HTML via "cid:logo".
const LOGO_BASE64 = "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"

const TASTING_LABELS: Record<string, string> = {
  wein_tasting:                  'Wein Tasting',
  afterwork_wein_tasting:        'Afterwork Wein Tasting',
  gin_tasting:                   'Gin Tasting',
  champagner_popcorn_tasting:    'Champagner & Popcorn',
  trueffel_champagner_tasting:   'Trüffel & Champagner',
  whisky_tasting:                'Whisky Tasting',
  craft_beer_tasting:            'Craft Beer Tasting',
  wagyu_wein_champagner_tasting: 'Wagyu, Wein & Champagner',
  apero_antipasti_tasting:       'Apéro & Antipasti',
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const rawBody = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  // Stripe-Signatur manuell prüfen (kein SDK nötig)
  const valid = await verifyStripeSignature(rawBody, signature, webhookSecret)
  if (!valid) {
    console.error('Invalid Stripe signature')
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(rawBody)

  if (event.type !== 'checkout.session.completed') {
    return new Response('ok', { status: 200 })
  }

  const session = event.data.object
  const tastingType: string = session.metadata?.tasting_type
  const persons: number = parseInt(session.metadata?.persons ?? '0', 10)

  if (!tastingType || !persons) {
    console.error('Missing metadata in session:', session.id)
    return new Response('ok', { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Idempotenz: Session schon verarbeitet?
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (existingOrder) {
      console.log('Session already processed:', session.id)
      return new Response('ok', { status: 200 })
    }

    const customerEmail: string = session.customer_details?.email ?? ''
    const customerName: string = session.customer_details?.name ?? 'Unbekannt'
    const totalAmount: number = (session.amount_total ?? 0) / 100

    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .insert({ name: customerName, email: customerEmail })
      .select('id')
      .single()
    if (cErr) throw cErr

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        order_type: 'tasting_voucher',
        payment_status: 'paid',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        total_amount: totalAmount,
        currency: session.currency ?? 'eur',
        metadata: { tasting_type: tastingType, persons },
      })
      .select('id')
      .single()
    if (oErr) throw oErr

    const { error: iErr } = await supabase.from('order_items').insert({
      order_id: order.id,
      product_name: `Tasting-Gutschein: ${TASTING_LABELS[tastingType] ?? tastingType}`,
      tasting_type: tastingType,
      quantity: persons,
      unit_price: totalAmount / persons,
    })
    if (iErr) throw iErr

    const { data: voucherCode, error: vErr } = await supabase
      .rpc('generate_voucher_code', { p_tasting_type: tastingType })
    if (vErr) throw vErr

    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const { error: vcErr } = await supabase.from('vouchers').insert({
      voucher_code: voucherCode,
      order_id: order.id,
      customer_id: customer.id,
      tasting_type: tastingType,
      persons,
      status: 'active',
      valid_until: validUntil,
    })
    if (vcErr) throw vcErr

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const websiteUrl = Deno.env.get('WEBSITE_URL') ?? 'https://genusswerte-bonn.de'

    if (resendKey && customerEmail) {
      await sendConfirmationEmail({
        resendKey, websiteUrl,
        to: customerEmail,
        name: customerName,
        voucherCode,
        tastingLabel: TASTING_LABELS[tastingType] ?? tastingType,
        persons,
        validUntil,
      })
    }

    console.log(`Voucher created: ${voucherCode} for ${customerEmail}`)
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('stripe-webhook processing error:', err)
    return new Response('ok', { status: 200 })
  }
})

// Toleranzfenster gegen Replay-Angriffe: ein einmal abgefangener, gueltig
// signierter Payload darf nicht beliebig lange spaeter erneut eingespielt
// werden koennen. Stripes eigenes SDK nutzt standardmaessig 300s.
const SIGNATURE_TOLERANCE_SECONDS = 300

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts: Record<string, string> = {}
    for (const part of signature.split(',')) {
      const [k, v] = part.split('=')
      parts[k] = v
    }

    const timestamp = parts['t']
    const v1 = parts['v1']
    if (!timestamp || !v1) return false

    // Replay-Schutz: Zeitstempel darf nicht zu alt (oder aus der Zukunft) sein
    const timestampNum = Number(timestamp)
    if (!Number.isFinite(timestampNum)) return false
    const ageSeconds = Math.abs(Date.now() / 1000 - timestampNum)
    if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )

    const signed = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${timestamp}.${payload}`),
    )

    const expected = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return timingSafeEqual(expected, v1)
  } catch {
    return false
  }
}

// HTML-escapen fuer Werte, die aus Nutzereingaben stammen (z.B. der Name,
// den jemand im Stripe-Checkout-Formular eintraegt) und in die E-Mail-
// Vorlage eingesetzt werden — verhindert HTML-/Markup-Injection in der
// versendeten Bestaetigungsmail.
function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function sendConfirmationEmail(opts: {
  resendKey: string
  websiteUrl: string
  to: string
  name: string
  voucherCode: string
  tastingLabel: string
  persons: number
  validUntil: string
}) {
  const { resendKey, websiteUrl, to, name, voucherCode, tastingLabel, persons, validUntil } = opts
  const personsLabel = `${persons} ${persons === 1 ? 'Person' : 'Personen'}`
  const validDate = new Date(validUntil).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<style>:root{color-scheme:light only;supported-color-schemes:light only;}</style>
</head>
<body style="margin:0;padding:0;background:#eee9de;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eee9de;padding:40px 16px;">
<tr><td align="center">
<table width="460" cellpadding="0" cellspacing="0" style="background:#fffdf9;border-radius:18px;overflow:hidden;">

  <tr><td style="background:#1c3a2e;padding:30px 20px 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
      <tr><td style="width:88px;height:88px;border-radius:50%;background:#f9f5ef;text-align:center;vertical-align:middle;">
        <img src="cid:logo" width="64" alt="Genusswerte Bonn" style="display:block;margin:12px auto 0;border:0;">
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e7d6a4;">Dein Tasting-Gutschein</p>
    <h1 style="margin:8px 0 0;font-size:24px;font-weight:400;color:#f9f5ef;">Vielen Dank für deinen Kauf.</h1>
  </td></tr>

  <tr><td style="padding:0 22px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed rgba(28,58,46,0.25);font-size:0;line-height:0;">&nbsp;</td></tr></table>
  </td></tr>

  <tr><td style="padding:28px 32px 6px;text-align:center;">
    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.75;color:#55503f;">
      Liebe/r ${esc(name)}, dein Gutschein ist bereit &ndash; hier ist dein persönlicher Code.
    </p>
  </td></tr>

  <tr><td style="padding:14px 32px 0;text-align:center;">
    <p style="margin:0;font-size:25px;color:#1c3a2e;">${tastingLabel}</p>
    <p style="margin:4px 0 22px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#c9a84c;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">${personsLabel}</p>
  </td></tr>

  <tr><td style="padding:0 32px 8px;text-align:center;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5ef;border-radius:10px;">
      <tr><td style="padding:18px;text-align:center;">
        <span style="display:block;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#55503f;margin-bottom:8px;">Dein Gutscheincode</span>
        <span style="display:block;font-size:22px;color:#1c3a2e;font-weight:bold;letter-spacing:2px;">${voucherCode}</span>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;color:#26241d;font-weight:700;">So löst du deinen Gutschein ein:</p>
    <ol style="margin:0;padding-left:18px;font-family:Helvetica,Arial,sans-serif;color:#55503f;font-size:13px;line-height:2;">
      <li>Besuche <a href="${websiteUrl}/gutschein-einloesen.html" style="color:#1c3a2e;">${websiteUrl.replace('https://', '')}/gutschein-einloesen</a></li>
      <li>Gib deinen Code ein</li>
      <li>Wähle einen verfügbaren Termin</li>
      <li>Du erhältst eine Bestätigung per E-Mail</li>
    </ol>
  </td></tr>

  <tr><td style="padding:20px 32px 28px;text-align:center;">
    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11.5px;color:#8a8378;">Gültig bis ${validDate}</p>
  </td></tr>

  <tr><td style="background:#12241c;padding:22px 30px 26px;text-align:center;">
    <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11.5px;letter-spacing:1.5px;color:#e7d6a4;font-weight:700;">GENUSSWERTE BONN</p>
    <p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;color:rgba(249,245,239,0.72);line-height:1.6;">
      Clemens-August-Stra&szlig;e 38&ndash;40 &middot; 53115 Bonn-Poppelsdorf
    </p>
    <a href="tel:+4922825908928" style="font-family:Helvetica,Arial,sans-serif;font-size:11.5px;color:#e7d6a4;text-decoration:none;border-bottom:1px solid rgba(201,168,76,0.4);">0228 2590 8928</a>
    <span style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:rgba(249,245,239,0.35);margin:0 8px;">&middot;</span>
    <a href="https://instagram.com/genusswerte.bonn" style="font-family:Helvetica,Arial,sans-serif;font-size:11.5px;color:#e7d6a4;text-decoration:none;border-bottom:1px solid rgba(201,168,76,0.4);">@genusswerte.bonn</a>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Genusswerte Bonn <gutscheine@genusswerte-bonn.com>',
      to: [to],
      subject: `Dein Tasting-Gutschein: ${voucherCode}`,
      html,
      attachments: [
        {
          filename: 'genusswerte-logo.png',
          content: LOGO_BASE64,
          content_id: 'logo',
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}
