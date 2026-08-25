# Edge Functions Setup — Genusswerte Bonn

## Voraussetzungen

- Supabase CLI installiert: `npm install -g supabase`
- Supabase Projekt erstellt (https://supabase.com)
- Stripe Account mit API Keys
- Resend Account mit verifizierter Domain

---

## 1. Supabase Projekt verknüpfen

```bash
supabase login
supabase link --project-ref DEIN-PROJEKT-REF
```

Den Projekt-Ref findest du in Supabase Dashboard → Settings → General.

---

## 2. Secrets setzen

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set WEBSITE_URL=https://genusswerte-bonn.de
```

**Wichtig:** `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` werden automatisch
von Supabase injiziert — nicht selbst setzen.

---

## 3. Migrationen ausführen

```bash
supabase db push
```

Reihenfolge: 001 → 002 → 003 → 004 → 005 → 006 → 007

---

## 4. Edge Functions deployen

```bash
supabase functions deploy validate-voucher
supabase functions deploy get-available-slots
supabase functions deploy schedule-voucher
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

Oder alle auf einmal:
```bash
supabase functions deploy
```

---

## 5. Stripe Webhook einrichten

Im Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://DEIN-PROJEKT.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`

Den `Signing secret` (whsec_...) als `STRIPE_WEBHOOK_SECRET` setzen (Schritt 2).

---

## 6. Website config.js aktualisieren

In `website/assets/js/config.js`:

```js
window.GW_CONFIG = {
  apiBase: 'https://DEIN-PROJEKT.supabase.co/functions/v1'
}
```

---

## Edge Functions Übersicht

| Function | Aufrufer | Beschreibung |
|---|---|---|
| `validate-voucher` | Website | Gutscheincode prüfen |
| `get-available-slots` | Website | Freie Termine laden |
| `schedule-voucher` | Website | Termin reservieren (atomar) |
| `create-checkout-session` | Website | Stripe Checkout Session erstellen |
| `stripe-webhook` | Stripe | Nach Zahlung: Order + Voucher anlegen + E-Mail |

---

## Secrets Übersicht

| Secret | Wert | Wo |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard → API Keys |
| `WEBSITE_URL` | `https://genusswerte-bonn.de` | Manuell |
