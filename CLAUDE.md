# CLAUDE.md — Genusswerte Bonn

## Projekt
Statische Website (Vanilla HTML/CSS/JS, kein Framework, kein Build-Tool) für Genusswerte Bonn — Feinkost- & Tasting-Boutique in Bonn-Poppelsdorf. Deployment via FTP auf all-inkl.com.

Backend ist **live**: Supabase Edge Functions + Stripe Checkout + Resend E-Mail. Details → `PROJECT_CONTEXT.md`.

## Seiten
`index.html` · `tastings.html` · `gutscheine-boxen.html` · `gutschein-einloesen.html` · `kontakt.html` · `impressum.html` · `datenschutz.html`

## Geschäftsdaten
- Adresse: Clemens-August-Straße 38–40, 53115 Bonn-Poppelsdorf
- Telefon: 0228 2590 8928 · Instagram: @genusswerte.bonn
- Öffnung: Di 12–19 · Mi 12–20 · Do–Sa 10–21 · Mo+So geschlossen

## Design
**Claim:** Taste – Discover – Enjoy  
**Farben:** Dunkelgrün `#1c3a2e` / Creme `#f9f5ef` / Gold `#c9a84c` / Anthrazit für Text  
**Schrift:** Serif für Headlines, Sans-Serif für UI & Fließtext  
**Stil:** warm, editorial, hochwertig — kein Template-Look, kein generischer Shop  
**Regeln:** keine Apple Emojis · keine Standard-Cards · keine übergroßen Buttons · klare CTA-Hierarchie · mobile immer mitdenken · CSS-Tokens in `assets/css/base.css` nicht brechen

## Navigation
Tastings · Gutscheine & Boxen · Kontakt · Gutschein einlösen

## Technische Grenzen
Nicht einbauen ohne expliziten Auftrag: neues Framework · Build-Tool · direkte DB-Verbindung von der Website · Admin-Panel-Logik · neue Checkout-Flows

Website ruft Backend **nur** via `fetch()` auf Edge Functions (`window.GW_CONFIG.apiBase`) — nie direkt Supabase.

## Arbeitsweise
- Immer step-by-step. Nur den beauftragten Bereich ändern.
- Nach Änderungen kurz nennen: was geändert · was nicht · nächster sinnvoller Schritt.
- Keine großen Features ohne Auftrag.
- **Kontext sparen:** Dateien nur abschnittsweise lesen (offset/limit), nicht blind ganze Dateien laden.

## Detailwissen on-demand
Vollständige Doku zu Backend, Tasting-Typen, Preisen, DB-Schema → `PROJECT_CONTEXT.md` lesen wenn nötig.
