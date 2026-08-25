# PROJECT_CONTEXT.md

Ziel:
Die statische Genusswerte-Bonn-Website soll an Supabase Edge Functions und Stripe angebunden werden.

Architektur:
Website → Edge Functions / Stripe → Supabase → separates Admin Panel

Wichtig:
- Website bleibt statisch bei all-inkl.
- Kein React, kein Vite, kein Admin Panel in diesem Projekt.
- Keine service_role Keys im Frontend.
- Kein direkter Supabase-Tabellenzugriff.
- Website ruft nur Edge Functions per fetch() auf.
- Admin Panel ist separates Projekt und wird hier nicht geändert.

Kaufflow:
Tasting kaufen → create-checkout-session → Stripe Checkout → Stripe Webhook → Supabase Order/Voucher → Admin Panel zeigt Zahlung.

Einlöseflow:
Code prüfen → validate-voucher
Termine laden → get-available-slots
Termin buchen → schedule-voucher
Danach erscheint Reservierung im Admin Panel.

Relevante Dateien:
- tastings.html
- gutschein-einloesen.html
- assets/js/main.js
- assets/js/tastings-data.js
- assets/js/checkout.js
- assets/js/voucher-form.js
- assets/js/config.js

Tasting Mapping:
wein → wein_tasting
afterwork → afterwork_wein_tasting
gin → gin_tasting
champagner → champagner_popcorn_tasting
trueffel → trueffel_champagner_tasting
whisky → whisky_tasting
craftbeer → craft_beer_tasting
wagyu → wagyu_wein_champagner_tasting
apero → apero_antipasti_tasting

Nicht ändern:
- admin-panel
- supabase
- Admin Panel Code
- Migrationen
- Stripe Webhook
- Resend/PDF