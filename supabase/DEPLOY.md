# Edge Functions deployen

## Reihenfolge

1. `tastings_setup.sql` im Supabase SQL Editor ausführen (bereits erledigt)
2. `voucher_migration.sql` im Supabase SQL Editor ausführen
3. Die 3 Edge Functions deployen (s.u.)

## Edge Functions via Supabase CLI

```bash
# Einmalig: Supabase CLI installieren (falls noch nicht vorhanden)
npm install -g supabase

# Einloggen
supabase login

# Ins Projektverzeichnis wechseln und mit Supabase-Projekt verbinden
supabase link --project-ref dwreeykpjptfncjijjmg

# Alle 3 Functions deployen
supabase functions deploy validate-voucher    --project-ref dwreeykpjptfncjijjmg
supabase functions deploy get-available-slots --project-ref dwreeykpjptfncjijjmg
supabase functions deploy schedule-voucher    --project-ref dwreeykpjptfncjijjmg
```

Die Funktionen liegen in `supabase/functions/<name>/index.ts`.

## Alternativ: über das Supabase Dashboard

Dashboard → Edge Functions → "New Function" → Code aus den .ts-Dateien einfügen.

## Wichtig: Schema-Abgleich

Die Edge Functions erwarten diese Spalten in der `vouchers`-Tabelle:
- `code` TEXT
- `status` TEXT (Werte: `active`, `redeemed`)
- `persons` INTEGER
- `expires_at` TIMESTAMPTZ (nullable)
- `tasting_slug` TEXT (wird von `voucher_migration.sql` hinzugefügt)

Für `redemption_requests` werden erwartet:
- `voucher_code` TEXT
- `slot_id` UUID
- `customer_name`, `customer_email`, `customer_phone`, `customer_address` TEXT
- `status` TEXT

Falls die Spaltennamen abweichen → in `schedule-voucher/index.ts` anpassen.
