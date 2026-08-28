import { getCorsHeaders } from '../_shared/cors.ts'

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

const PRICE_PER_PERSON: Record<string, number> = {
  wein_tasting:                  2900,
  afterwork_wein_tasting:        1900,
  gin_tasting:                   4500,
  champagner_popcorn_tasting:    3900,
  trueffel_champagner_tasting:   6600,
  whisky_tasting:                4500,
  craft_beer_tasting:            2500,
  wagyu_wein_champagner_tasting: 5500,
  apero_antipasti_tasting:       2900,
}

Deno.serve(async (req) => {
  // Pro Request neu berechnet (nicht auf Modulebene) — sonst koennten sich
  // bei gleichzeitigen Anfragen unterschiedlicher Herkunft die Origin-
  // Header vermischen.
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
    const { tasting_type, persons, customer_email } = await req.json()

    if (!tasting_type || !PRICE_PER_PERSON[tasting_type]) {
      return json({ error: 'INVALID_TASTING_TYPE' }, 400)
    }
    if (!persons || persons < 1 || persons > 6 || !Number.isInteger(persons)) {
      return json({ error: 'INVALID_PERSONS' }, 400)
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const websiteUrl = Deno.env.get('WEBSITE_URL') ?? 'https://genusswerte-bonn.com'
    const unitAmount = PRICE_PER_PERSON[tasting_type]
    const label = TASTING_LABELS[tasting_type]
    const personsLabel = `${persons} ${persons === 1 ? 'Person' : 'Personen'}`

    const params = new URLSearchParams({
      mode: 'payment',
      // Kein festes payment_method_types[] mehr — Stripe zeigt automatisch
      // alle im Dashboard aktivierten Zahlungsarten (Karte, PayPal, Klarna,
      // giropay, SEPA, ...), passend zu Währung/Kunde. Einfach im Stripe-
      // Dashboard unter "Zahlungsmethoden" aktivieren, kein Code-Update nötig.
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(unitAmount),
      'line_items[0][price_data][product_data][name]': `Tasting-Gutschein: ${label}`,
      'line_items[0][price_data][product_data][description]': `Gutschein für ${personsLabel} — Termin wählst du nach Kauf`,
      'line_items[0][quantity]': String(persons),
      'metadata[tasting_type]': tasting_type,
      'metadata[persons]': String(persons),
      'metadata[product_type]': 'tasting_voucher',
      success_url: `${websiteUrl}/checkout-success.html`,
      cancel_url: `${websiteUrl}/tastings.html?checkout=cancelled`,
    })

    if (customer_email) {
      params.set('customer_email', customer_email)
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await res.json()

    if (!res.ok) {
      console.error('Stripe error:', session)
      return json({ error: 'STRIPE_ERROR' }, 500)
    }

    return json({ url: session.url })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
