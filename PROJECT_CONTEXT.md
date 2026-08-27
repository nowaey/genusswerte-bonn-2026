# PROJECT_CONTEXT.md — Genusswerte Bonn
> Detaildoku für Claude. Nur lesen wenn für die konkrete Aufgabe nötig.

---

## ⚠️ Buchungssystem ist PAUSIERT (seit 27.08.2026) — HIER STEHT DIE VOLLSTÄNDIGE RELAUNCH-CHECKLISTE

Das eigene Gutschein-/Einlösesystem ist **frontseitig abgeschaltet**. Die Tastings werden
über das externe Genusswerte-System gebucht (`genusswerte.com/shop/products/detail/...`).

**Der Schalter:** `website/assets/js/config.js` → `bookingEnabled: false`

Backend bleibt vollständig deployed — Edge Functions, Stripe, DB, Admin-Panel. Pausiert ist
ausschließlich die Sichtbarkeit im Frontend. **Zusätzlich** gibt es seit dem Security-Audit
vom 27.08.2026 (Details siehe „Security-Härtung" weiter unten) noch **5 Edge Functions mit
fertigem, aber nicht deploytem Fix-Code** — die müssen beim Relaunch mit rein, siehe Schritt 2
unten. Das ist der Teil, den man beim schnellen Überfliegen leicht übersieht — deshalb
steht hier alles an einer Stelle.

**Wie die Pause technisch funktioniert:**
- `config.js` liegt im `<head>` aller 9 Seiten (ohne `defer`/`async`) und hängt `gw-booking-off`
  bzw. `gw-booking-on` an `<html>`
- `base.css` blendet darüber `[data-booking-only]` bzw. `[data-booking-off-only]` aus
- Karten-Buttons auf `tastings.html` rendern als externe `<a>` statt Modal-Button (`main.js`, `renderTastingCards`)
- Modal und Checkout sind per Guard inaktiv; `gutschein-einloesen.html` zeigt einen On-Hold-Hinweis
  und bekommt automatisch `noindex`
- **Nav-CTA ist NICHT Teil des Schalters:** Der Button oben rechts zeigt seit Einführung von
  „Gruppen & Events" dauerhaft dorthin, unabhängig von `bookingEnabled`. Beim Relaunch taucht
  „Gutschein einlösen" wieder in Footer/Hero/Closing-CTA auf (weiterhin `data-booking-only`),
  aber **nicht** im Nav-Slot — dort bleibt „Gruppen & Events" stehen. So ist es gewollt.

**Nichts mit `data-booking-only` / `data-booking-off-only` löschen** — das ist der Rücksprung-Pfad.
Kontrolle, dass keine Marker verloren gingen: `grep -o 'data-booking-only' website/*.html | wc -l` → **19**,
`grep -o 'data-booking-off-only' website/*.html | wc -l` → **6**.

### ✅ RELAUNCH-CHECKLISTE — komplett, in dieser Reihenfolge

**1. Die 5 noch offenen Edge-Function-Fixes deployen** (Details/Hintergrund siehe
   „Security-Härtung" weiter unten — hier nur die Handlungsschritte):
   - `create-checkout-session`, `validate-voucher`, `get-available-slots`,
     `schedule-voucher`, `stripe-webhook` — Code liegt fertig in
     `supabase/functions/<name>/index.ts`.
   - Bei den 4 Functions außer `stripe-webhook`: Dashboard-Copy-Paste braucht den
     `getCorsHeaders`-Code **inline** statt `import ... from '../_shared/cors.ts'`
     (Dashboard-Editor kennt nur eine Datei pro Function). Muster/Vorlage: wie bei
     `submit-group-inquiry` bereits gemacht (siehe „Security-Härtung" unten für den
     genauen Inline-Block).
   - `stripe-webhook` braucht keinen Umbau, kein `_shared`-Import vorhanden — 1:1 einfügen.
   - Nach jedem Deploy: „Enforce JWT Verification" muss AUS sein (Dashboard → Function →
     Settings) — springt beim Neu-Deploy manchmal wieder auf „an".
2. **Stripe-Live-Keys setzen** — läuft aktuell im **Testmodus** (`STRIPE_SECRET_KEY` /
   `STRIPE_WEBHOOK_SECRET` in Supabase Secrets auf echte Live-Keys umstellen).
3. **`WEBSITE_URL`-Secret prüfen** — muss auf die echte, aktuelle Produktions-Domain zeigen
   (aktuell hinterlegt: `https://genusswerte-bonn.de`).
4. **`tasting_slots` anlegen** — über Admin Panel, sonst zeigt die Einlöseseite keine
   echten Termine.
5. **`bookingEnabled: true`** in `website/assets/js/config.js` setzen, Datei per FTP hochladen.
   Das ist der eigentliche Schalter — Nav/Footer/Hero-Links, Modal und Checkout kommen
   damit sofort zurück.
6. **Live testen**: einen echten Testkauf durchklicken (kleiner Betrag oder Stripe-Testkarte
   falls Testmodus versehentlich noch aktiv), prüfen dass die Bestätigungsmail ankommt und
   der Gutschein sich einlösen lässt.
7. **Suchmaschinen-Reindexierung** — `gutschein-einloesen.html` war während der Pause
   `noindex`. In der Google Search Console (falls vorhanden) eine Neuindexierung anstoßen,
   nicht auf den nächsten Crawl warten.

---

## Security-Härtung (27.08.2026) — Hintergrund zu Schritt 1 oben

Audit + Härtungsdurchgang. **`submit-group-inquiry` ist deployed und live-getestet**
(CORS-Allowlist + Rate-Limit per curl bestätigt: fremde Origin wird abgewiesen, 8.
Anfrage/Stunde bekommt `429`). **Die anderen 5 Functions sind nur Code im Repo, noch
nicht deployed** — das ist Schritt 1 der Relaunch-Checkliste oben.

**Was geändert wurde (gilt für alle 6 Functions gleichermaßen, ob schon deployed oder nicht):**
1. **HTML-Injection behoben** — `stripe-webhook` und `schedule-voucher` interpolierten den
   Kundennamen unescaped in HTML-E-Mails (`esc()`-Helper ergänzt, wie ihn `submit-group-inquiry`
   schon hatte).
2. **CORS von `*` auf Allowlist** — `supabase/functions/_shared/cors.ts` exportiert
   `getCorsHeaders(origin)` statt eines statischen `*`-Objekts. Erlaubt: `genusswerte-bonn.de`,
   `*.vercel.app`, `localhost`. Jede Function berechnet `cors` pro Request neu (nicht auf
   Modulebene — sonst Race Condition zwischen gleichzeitigen Requests unterschiedlicher Herkunft).
3. **Stripe-Webhook: Replay-Schutz** — Signatur-Zeitstempel wird gegen ein 300s-Toleranzfenster
   geprüft (wie Stripes eigenes SDK), Vergleich läuft timing-safe.
4. **Eingabelängen gedeckelt** — `schedule-voucher` und `submit-group-inquiry` lehnen
   überlange Eingaben ab.
5. **Rate-Limiting** — Migration `013_rate_limiting.sql` (Tabelle `rate_limit_hits` + Funktion
   `check_rate_limit()`, DB-basiert weil Edge-Function-Instanzen zustandslos sind). Aktuell
   nur in `submit-group-inquiry` eingebunden (8 Anfragen/IP/Stunde). Bei Bedarf auf weitere
   Functions übertragbar, gleiches Muster — RPC-Call vor der eigentlichen Logik, siehe
   `submit-group-inquiry/index.ts`.
6. **`gutscheine-boxen.html`**: Inline-`onclick`/`<script>` nach `assets/js/gutscheine-boxen.js`
   ausgelagert — nötig, damit die neue CSP ohne `unsafe-inline` für Scripts nicht die
   Bestellen-Buttons blockiert.
7. **HTTP-Security-Header** — `website/.htaccess` UND `vercel.json` (Vercel ignoriert
   `.htaccess`, hatte vorher NULL Security-Header) setzen: Content-Security-Policy,
   Strict-Transport-Security, Permissions-Policy. Lokal gegen alle 9 Seiten getestet
   (0 CSP-Verstöße). Bereits live (kam mit dem normalen FTP-Upload mit).
8. `website/robots.txt` ergänzt, `website/.gitignore` gegen versehentlich committete
   `.env`/`.sql`/`.bak`-Dateien im FTP-Deploy-Ordner. Bereits live.

**Dashboard-Deploy der restlichen 5 Functions — der Cors-Inline-Block** (Dashboard-Editor
kennt nur eine Datei pro Function, kein Import möglich). Bei `create-checkout-session`,
`validate-voucher`, `get-available-slots`, `schedule-voucher` ersetzt dieser Block die
Zeile `import { getCorsHeaders } from '../_shared/cors.ts'`:
```ts
/* Origin-Allowlist inline (Dashboard-Editor kennt nur eine Datei pro
   Funktion, kein Import von _shared/cors.ts moeglich). Repo-Version
   nutzt stattdessen den gemeinsamen Import — bei CLI-Deploy die
   Repo-Datei verwenden, nicht diese hier zurueckspielen. */
const ALLOWED_ORIGINS = [
  'https://genusswerte-bonn.de',
  'https://www.genusswerte-bonn.de',
]
const ALLOWED_ORIGIN_SUFFIXES = ['.vercel.app']
const ALLOWED_ORIGIN_PREFIXES = ['http://localhost:', 'http://127.0.0.1:']
function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (ALLOWED_ORIGIN_SUFFIXES.some((s) => origin.endsWith(s))) return true
  if (ALLOWED_ORIGIN_PREFIXES.some((p) => origin.startsWith(p))) return true
  return false
}
function getCorsHeaders(origin) {
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
```
`stripe-webhook` braucht diesen Block NICHT (kein `_shared`-Import, läuft Server-zu-Server
ohne CORS) — die Datei 1:1 einfügen.

**Häufigster Stolperstein beim Dashboard-Deploy** (ist uns selbst passiert): Beim Markieren
im Editor nicht ganz oben angefangen → `getCorsHeaders is not defined`-Fehler zur Laufzeit.
Immer Strg+A (alles markieren) statt manuell ziehen, dann Zeile 1 nach dem Einfügen
gegenchecken.

---

## Gruppen- & Event-Anfragen (seit 27.08.2026) — LIVE

Seite `website/gruppen-events.html` mit Formular (Name, E-Mail, Telefon, Anlass,
Personenanzahl, Wunschtermin, Nachricht). Ersetzt den alten `kontakt.html#gruppen-anfrage`-
Mailto-Umweg als primären Weg für Gruppenanfragen. Nav-CTA zeigt dauerhaft hierhin
(siehe „Buchungssystem PAUSIERT" oben).

**Versand:** Edge Function `supabase/functions/submit-group-inquiry/index.ts` — **deployed,
live getestet**. Schickt die Formulardaten per Resend an `info@genusswerte-bonn.com`,
`reply_to` ist die Absender-Adresse. Keine DB-Schreibung der Anfrage selbst — nur die
Rate-Limit-Zählung landet in der DB (siehe „Security-Härtung" oben).

Frontend-Logik: `website/assets/js/group-inquiry-form.js`. Nutzt die bestehenden
Formular-Klassen aus `components.css` — keine neue CSS-Datei.

---

## Backend-Status (Stand: August 2026)

Das komplette Payment-Flow läuft produktionsbereit:

**Supabase-Projekt:** `dwreeykpjptfncjijjmg`  
**Supabase-URL:** `https://dwreeykpjptfncjijjmg.supabase.co`  
**Website-Config:** `website/assets/js/config.js` → `apiBase` zeigt auf diese URL

### Edge Functions (alle mit `--no-verify-jwt` / „Enforce JWT Verification" aus)

⚠️ Bei den ersten 5 läuft aktuell noch der **alte Code ohne die Security-Fixes** vom
27.08.2026 — deployed heißt hier nicht „aktueller Stand", siehe Relaunch-Checkliste ganz
oben in diesem Dokument.

| Function | Aufrufer | Aufgabe |
|---|---|---|
| `create-checkout-session` | Website | Stripe Checkout Session erstellen |
| `stripe-webhook` | Stripe | Zahlung → Order + Voucher + E-Mail |
| `validate-voucher` | Website | Gutscheincode prüfen |
| `get-available-slots` | Website | Freie Termine laden |
| `schedule-voucher` | Website | Termin atomar reservieren |
| `submit-group-inquiry` | Website (`gruppen-events.html`) | Gruppen-/Event-Anfrage per E-Mail — **aktueller Stand deployed** |

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

1. **⚠️ API Keys rotieren** — Stripe Secret Key, Webhook Secret und Resend Key wurden einmal
   im Chat geteilt (unabhängig vom Booking-Relaunch, sollte zeitnah passieren — nicht erst
   beim Relaunch). Neue Keys in Supabase Secrets setzen. Außerdem: ein `sb_secret_...`-Key
   wurde am 27.08.2026 ebenfalls im Chat gepostet, sollte ebenso rotiert sein/werden.
2. **`migrations/003_functions.sql`** updaten — `search_path = public, extensions` fehlt noch.
3. **Root-Bilder** in `assets/images/` verschieben + HTML-Pfade anpassen (Phase 2 aus Plan).

(Tasting-Slots anlegen und Stripe-Live-Keys setzen stehen in der Relaunch-Checkliste ganz
oben, nicht hier — nicht doppelt pflegen.)

---

## Admin Panel (separates Projekt)

React / Vite / TypeScript — liegt in `admin-panel/` aber wird als eigenständiges Deployment betrieben.  
Verbindet sich direkt mit Supabase (service_role) — nie mit der Website vermischt.
