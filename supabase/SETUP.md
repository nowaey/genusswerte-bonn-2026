# Supabase Setup — Genusswerte Bonn

## 1. Supabase-Projekt anlegen

1. Unter [app.supabase.com](https://app.supabase.com) neues Projekt anlegen
2. Region: `eu-central-1` (Frankfurt) empfohlen
3. Starkes Passwort notieren

## 2. Umgebungsvariablen notieren

Aus den Projekt-Einstellungen (Settings → API):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> **Wichtig:** `SERVICE_ROLE_KEY` niemals im Frontend oder im Admin Panel Client nutzen.
> Er wird nur in Edge Functions und im Stripe Webhook verwendet.

## 3. Migrationen ausführen

Im Supabase Dashboard → SQL Editor → in dieser Reihenfolge ausführen:

| Datei                   | Inhalt                              |
|-------------------------|-------------------------------------|
| `001_enums.sql`         | Alle Enum-Typen                     |
| `002_tables.sql`        | Alle Tabellen                       |
| `003_functions.sql`     | Helper + Business Logic Funktionen  |
| `004_triggers.sql`      | updated_at Triggers                 |
| `005_indexes.sql`       | Performance-Indexes                 |
| `006_views.sql`         | Admin-Views                         |
| `007_rls.sql`           | Row Level Security                  |

## 4. Ersten Admin-User anlegen

1. Im Dashboard → Authentication → Users → "Add user" → E-Mail + Passwort eingeben
2. Die neue `auth.users.id` (UUID) notieren
3. Im SQL Editor ausführen:

```sql
INSERT INTO admin_users (user_id, role)
VALUES ('<deine-auth-user-uuid>', 'super_admin');
```

4. Prüfen ob `is_admin()` funktioniert (als eingeloggter User im Admin Panel oder via SQL):

```sql
-- Als der eingeloggte User ausführen:
SELECT is_admin();
-- Erwartetes Ergebnis: true
```

## 5. Erste Testdaten (optional)

```sql
-- Einen Test-Tasting-Slot anlegen
INSERT INTO tasting_slots (tasting_type, slot_date, slot_time, capacity_total, notes)
VALUES (
  'gin_tasting',
  '2026-07-15',
  '19:00',
  12,
  'Gin Tasting — Testeintrag'
);

-- Prüfen ob View funktioniert
SELECT * FROM v_slot_availability;
```

## 6. RLS-Sicherheit prüfen

Mit dem **anon-Key** (kein Login) im API-Tester oder per `curl`:

```bash
# Muss 0 Ergebnisse oder 403 zurückgeben:
curl 'https://<project-ref>.supabase.co/rest/v1/vouchers?select=*' \
  -H "apikey: <anon-key>"

# Ebenfalls kein Zugriff:
curl 'https://<project-ref>.supabase.co/rest/v1/orders?select=*' \
  -H "apikey: <anon-key>"
```

## 7. Edge Functions (später)

```bash
# Supabase CLI installieren
npx supabase login
npx supabase link --project-ref <project-ref>

# Functions deployen
npx supabase functions deploy validate-voucher
npx supabase functions deploy get-available-slots
npx supabase functions deploy schedule-voucher
```

Secrets für Edge Functions hinterlegen:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
npx supabase secrets set STRIPE_SECRET_KEY=<stripe-secret>         # später
npx supabase secrets set STRIPE_WEBHOOK_SECRET=<webhook-secret>    # später
```

## 8. Stripe Webhook (später)

- Webhook-Endpoint: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events abonnieren: `checkout.session.completed`, `payment_intent.succeeded`
- Webhook-Secret in Supabase Secrets hinterlegen

## 9. Admin Panel deployen (später)

- Empfohlen: Vercel oder Netlify
- `.env` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (nur anon-key im Frontend!)
- Service Role Key **nicht** ins Admin Panel Frontend

## Voucher-Code-Format

```
GW-{PREFIX}-{YYYY}-{8 Zeichen}
Beispiel: GW-GIN-2026-A8K3P9HX
```

Präfixe:

| Tasting                      | Präfix |
|------------------------------|--------|
| Wein Tasting                 | WT     |
| Afterwork Wein Tasting       | AW     |
| Gin Tasting                  | GIN    |
| Champagner & Popcorn         | CP     |
| Trüffel & Champagner         | TC     |
| Whisky Tasting               | WH     |
| Craft Beer Tasting           | CB     |
| Wagyu, Wein & Champagner     | WB     |
| Apéro & Antipasti            | AA     |
