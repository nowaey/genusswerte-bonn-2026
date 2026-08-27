# PROJECT_CONTEXT.md — Genusswerte Bonn
> Detaildoku für Claude. Nur lesen wenn für die konkrete Aufgabe nötig.

---

## ⚠️ Security-Härtung (27.08.2026) — Deployment noch offen

Ein Audit + Härtungsdurchgang wurde gemacht. Der **Code liegt fertig im Repo**, ist aber
**noch nicht live** — Supabase-Edge-Functions und die neue Migration müssen manuell
nachgezogen werden (Dashboard-Copy-Paste wie beim ersten `submit-group-inquiry`-Deploy).

**Was geändert wurde:**
1. **HTML-Injection behoben** — `stripe-webhook` und `schedule-voucher` interpolierten den
   Kundennamen unescaped in HTML-E-Mails (`esc()`-Helper ergänzt, wie ihn `submit-group-inquiry`
   schon hatte).
2. **CORS von `*` auf Allowlist** — `supabase/functions/_shared/cors.ts` exportiert jetzt
   `getCorsHeaders(origin)` statt eines statischen `*`-Objekts. Erlaubt: `genusswerte-bonn.de`,
   `*.vercel.app`, `localhost`. **Betrifft alle 6 Functions** — jede berechnet `cors` jetzt
   pro Request neu (wichtig: nicht auf Modulebene, sonst Race Condition zwischen
   gleichzeitigen Requests unterschiedlicher Herkunft).
3. **Stripe-Webhook: Replay-Schutz** — Signatur-Zeitstempel wird jetzt gegen ein
   300s-Toleranzfenster geprüft (wie Stripes eigenes SDK), Vergleich läuft timing-safe.
4. **Eingabelängen gedeckelt** — `schedule-voucher` und `submit-group-inquiry` lehnen
   überlange Eingaben ab (vorher nur Pflichtfeld-Check, keine Obergrenze).
5. **Rate-Limiting** — neue Migration `013_rate_limiting.sql` (Tabelle `rate_limit_hits` +
   Funktion `check_rate_limit()`, DB-basiert weil Edge-Function-Instanzen zustandslos sind).
   Aktuell nur in `submit-group-inquiry` eingebunden (8 Anfragen/IP/Stunde) — das anfälligste
   Formular, weil es ohne Zahlungsschranke E-Mails auslöst. Bei Bedarf auf weitere Functions
   übertragbar, gleiches Muster.
6. **`gutscheine-boxen.html`**: Inline-`onclick`/`<script>` nach `assets/js/gutscheine-boxen.js`
   ausgelagert (addEventListener statt onclick) — nötig, damit die neue CSP ohne
   `unsafe-inline` für Scripts nicht die Bestellen-Buttons blockiert.
7. **HTTP-Security-Header** — `website/.htaccess` UND `vercel.json` (Vercel ignoriert
   `.htaccess` komplett, hatte vorher NULL Security-Header) setzen jetzt beide:
   Content-Security-Policy, Strict-Transport-Security, Permissions-Policy. Lokal gegen
   alle 9 Seiten getestet (0 CSP-Verstöße).
8. `website/robots.txt` ergänzt (fehlte), `website/.gitignore` als Verteidigung in der
   Tiefe gegen versehentlich committete `.env`/`.sql`/`.bak`-Dateien im FTP-Deploy-Ordner.

**Deployment-Checkliste — diese Reihenfolge einhalten:**
1. **Migration zuerst**: `supabase/migrations/013_rate_limiting.sql` im Supabase SQL Editor
   ausführen (Dashboard → SQL Editor → Datei-Inhalt einfügen → Run). Ohne das schlägt
   `submit-group-inquiry` nicht fehl (Rate-Limit-Fehler werden bewusst durchgelassen,
   siehe Kommentar im Code), aber das Limit greift dann noch nicht.
2. **Alle 6 Edge Functions neu deployen** — Code für jede liegt im Repo unter
   `supabase/functions/<name>/index.ts`. Bei `create-checkout-session` und
   `submit-group-inquiry`: der Import `from '../_shared/cors.ts'` funktioniert nur bei
   CLI-Deploy; beim Dashboard-Copy-Paste (wie bisher) muss der Inhalt von `_shared/cors.ts`
   wieder inline in die jeweilige Datei kopiert werden (`getCorsHeaders`-Funktion), analog
   zum ersten `submit-group-inquiry`-Deploy in dieser Session.
3. **JWT-Verifizierung prüfen** — falls beim Neu-Deployen über das Dashboard der Schalter
   „Enforce JWT Verification" wieder auf „an" zurückspringt (ist uns bei
   `submit-group-inquiry` passiert), erneut ausschalten.
4. Website-Dateien (`.htaccess`, `robots.txt`, `.gitignore`, alle `assets/`) ganz normal
   per FTP hochladen — kein Sonderfall.
5. Nach dem Deploy: CSP-Header per Browser-DevTools (Network-Tab → Response Headers) auf
   der echten Domain gegenchecken, nicht blind vertrauen.

---

## ⚠️ Buchungssystem ist PAUSIERT (seit 27.08.2026)

Das eigene Gutschein-/Einlösesystem ist **frontseitig abgeschaltet**. Die Tastings werden
über das externe Genusswerte-System gebucht (`genusswerte.com/shop/products/detail/...`).

**Der Schalter:** `website/assets/js/config.js` → `bookingEnabled: false`

Backend bleibt vollständig deployed und unangetastet — Edge Functions, Stripe, DB, Admin-Panel.
Pausiert ist ausschließlich die Sichtbarkeit im Frontend.

**Wie es funktioniert:**
- `config.js` liegt im `<head>` aller 9 Seiten (ohne `defer`/`async`) und hängt `gw-booking-off`
  bzw. `gw-booking-on` an `<html>`
- `base.css` blendet darüber `[data-booking-only]` bzw. `[data-booking-off-only]` aus
- Karten-Buttons auf `tastings.html` rendern als externe `<a>` statt Modal-Button (`main.js`, `renderTastingCards`)
- Modal und Checkout sind per Guard inaktiv; `gutschein-einloesen.html` zeigt einen On-Hold-Hinweis
  und bekommt automatisch `noindex`

**Relaunch:** `bookingEnabled: true` setzen, `config.js` hochladen. Fertig.
Vorher prüfen: Stripe-Live-Keys gesetzt (läuft aktuell im **Testmodus**), `WEBSITE_URL` korrekt,
`tasting_slots` angelegt, Edge Functions erreichbar.
Kontrolle, dass keine Marker verloren gingen: `grep -o 'data-booking-only' website/*.html | wc -l` → **19**,
`grep -o 'data-booking-off-only' website/*.html | wc -l` → **6**.

**Nichts mit `data-booking-only` / `data-booking-off-only` löschen** — das ist der Rücksprung-Pfad.

**Wichtig — Nav-CTA ist NICHT mehr Teil des Schalters (seit 27.08.2026):**
Der prominente Button oben rechts in der Navigation zeigt seit der Einführung von
„Gruppen & Events" **dauerhaft** dorthin, unabhängig von `bookingEnabled`. Das war
ursprünglich anders (dort wechselte „Gutschein einlösen" ↔ „Tasting buchen"), wurde aber
bewusst geändert — Gruppenanfragen sind ein eigenständiges Thema. Beim Relaunch taucht
„Gutschein einlösen" wieder in Footer/Hero/Closing-CTA auf (weiterhin `data-booking-only`),
aber **nicht** mehr im Nav-Slot — dort bleibt „Gruppen & Events" stehen.

---

## Gruppen- & Event-Anfragen (seit 27.08.2026)

Neue Seite `website/gruppen-events.html` mit Formular (Name, E-Mail, Telefon, Anlass,
Personenanzahl, Wunschtermin, Nachricht). Ersetzt den alten `kontakt.html#gruppen-anfrage`-
Mailto-Umweg als primären Weg für Gruppenanfragen.

**Versand:** neue Edge Function `supabase/functions/submit-group-inquiry/index.ts` —
schickt die Formulardaten per Resend als E-Mail an `info@genusswerte-bonn.com`,
`reply_to` ist die Absender-Adresse (direktes Antworten möglich). Keine DB-Schreibung,
keine Speicherung — reine Weiterleitung.

**⚠️ Muss noch deployed werden** — ist nur als Code im Repo vorhanden, aber (Stand jetzt)
noch nicht auf Supabase live. Bis dahin zeigt das Formular beim Absenden einen
Verbindungsfehler. Deploy z. B. über die Supabase CLI:
```
supabase functions deploy submit-group-inquiry
```
oder über das Supabase-Dashboard (Edge Functions → New Function → Code einfügen).
`RESEND_API_KEY` ist als Secret bereits vorhanden (wird von anderen Functions mitgenutzt),
kein neues Secret nötig.

Frontend-Logik: `website/assets/js/group-inquiry-form.js`. Wiederverwendet komplett die
bestehenden Formular-Klassen aus `components.css` (`.form-group`, `.form-input`, `.form-grid`,
`.form-success` etc.) — keine neue CSS-Datei.

---

## Backend-Status (Stand: August 2026)

Das komplette Payment-Flow läuft produktionsbereit:

**Supabase-Projekt:** `dwreeykpjptfncjijjmg`  
**Supabase-URL:** `https://dwreeykpjptfncjijjmg.supabase.co`  
**Website-Config:** `website/assets/js/config.js` → `apiBase` zeigt auf diese URL

### Edge Functions (alle deployed, alle mit `--no-verify-jwt`)

| Function | Aufrufer | Aufgabe |
|---|---|---|
| `create-checkout-session` | Website | Stripe Checkout Session erstellen |
| `stripe-webhook` | Stripe | Zahlung → Order + Voucher + E-Mail |
| `validate-voucher` | Website | Gutscheincode prüfen |
| `get-available-slots` | Website | Freie Termine laden |
| `schedule-voucher` | Website | Termin atomar reservieren |

Alle Functions nutzen raw `fetch()` — **kein Stripe SDK** (inkompatibel mit Supabase Deno).  
Shared CORS-Headers: `supabase/functions/_shared/cors.ts`

### Secrets (in Supabase gesetzt, nie im Code)
- `STRIPE_SECRET_KEY` — Stripe API Key
- `STRIPE_WEBHOOK_SECRET` — Stripe Webhook Signing Secret
- `RESEND_API_KEY` — Resend API Key
- `WEBSITE_URL` — `https://genusswerte-bonn.de`

### E-Mail
- Provider: Resend
- From: `Genusswerte Bonn <gutscheine@genusswerte-bonn.com>`
- Verifizierte Domain: `genusswerte-bonn.com` (nicht `.de`!)

### Wichtige DB-Eigenheit
`generate_voucher_code()` braucht `SET search_path = public, extensions` — `pgcrypto` liegt im `extensions`-Schema.  
Fix wurde direkt im Supabase SQL Editor angewendet, **nicht** in `migrations/003_functions.sql`. Bei Re-Run der Migration muss das manuell wiederholt werden.

---

## Tasting-Typen & Preise (pro Person in Cent)

| Key | Label | Preis |
|---|---|---|
| `wein_tasting` | Wein Tasting | 2900 |
| `afterwork_wein_tasting` | Afterwork Wein Tasting | 1900 |
| `gin_tasting` | Gin Tasting | 4500 |
| `champagner_popcorn_tasting` | Champagner & Popcorn | 3900 |
| `trueffel_champagner_tasting` | Trüffel & Champagner | 6600 |
| `whisky_tasting` | Whisky Tasting | 4500 |
| `craft_beer_tasting` | Craft Beer Tasting | 2500 |
| `wagyu_wein_champagner_tasting` | Wagyu, Wein & Champagner | 5500 |
| `apero_antipasti_tasting` | Apéro & Antipasti | 2900 |

---

## DB-Schema (Kurzübersicht)

Tabellen: `customers` · `orders` · `order_items` · `vouchers` · `tasting_slots` · `voucher_reservations`

Wichtige Spalten `vouchers`: `voucher_code`, `order_id`, `customer_id`, `tasting_type`, `persons`, `status` (active/reserved/used/cancelled/expired), `valid_until`

Wichtige Spalten `tasting_slots`: `id`, `tasting_type`, `slot_date`, `slot_time`, `capacity_total`, `capacity_reserved`, `status` (active/inactive/full/cancelled)

RPC-Funktionen: `generate_voucher_code(p_tasting_type)` · `reserve_voucher_slot(...)`

---

## Assets & Dateipfade

Alle HTML-Dateien liegen im Root. CSS/JS/Images in `assets/`.

4 Bilder liegen noch im Root (nicht in `assets/images/`), werden in HTML direkt referenziert:
- `tasting-wagyu-burger.jpg`
- `tasting-trueffel-carpaccio.jpg`
- `ladeninhaber-genusswerte-bonn.jpg`
- `passimoncello Website Bild.jpg`

CSS Design-Tokens: `assets/css/base.css`

---

## Offene Punkte

1. **⚠️ API Keys rotieren** — Stripe Secret Key, Webhook Secret und Resend Key wurden einmal im Chat geteilt. Neue Keys in Supabase Secrets setzen.
2. **Tasting-Slots anlegen** — über Admin Panel, damit Gutschein-Einlöseseite echte Termine zeigt.
3. **`migrations/003_functions.sql`** updaten — `search_path = public, extensions` fehlt noch.
4. **Root-Bilder** in `assets/images/` verschieben + HTML-Pfade anpassen (Phase 2 aus Plan).

---

## Admin Panel (separates Projekt)

React / Vite / TypeScript — liegt in `admin-panel/` aber wird als eigenständiges Deployment betrieben.  
Verbindet sich direkt mit Supabase (service_role) — nie mit der Website vermischt.
