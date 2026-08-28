/* =========================================================
   CORS — gemeinsame Konfiguration fuer alle Edge Functions
   die vom Browser aus aufgerufen werden (nicht stripe-webhook,
   das laeuft Server-zu-Server ohne CORS).

   Vorher: 'Access-Control-Allow-Origin': '*' — jede beliebige
   Website haette die Functions per Browser-Fetch aufrufen koennen.
   Jetzt: nur Ursprungsseiten aus dieser Liste werden akzeptiert.

   WICHTIG bei Domain-Aenderung: neue Domain hier eintragen, sonst
   schlagen Anfragen von dort mit einem CORS-Fehler fehl.
   ========================================================= */

const ALLOWED_ORIGINS = [
  'https://genusswerte-bonn.de',
  'https://www.genusswerte-bonn.de',
]

// Vercel-Preview-Deployments haben wechselnde, generierte Subdomains
// (z.B. genusswerte-bonn-2026-<hash>.vercel.app) — per Suffix erlaubt,
// nicht per Wildcard fuer alle Origins.
const ALLOWED_ORIGIN_SUFFIXES = [
  '.vercel.app',
]

// Lokale Vorschau/Entwicklung (z.B. der browser-sync-Server aus der
// lokalen Vorschau).
const ALLOWED_ORIGIN_PREFIXES = [
  'http://localhost:',
  'http://127.0.0.1:',
]

// Handy-Vorschau im selben WLAN (z.B. http://192.168.178.130:3000) —
// nicht per fester IP eintragen, die aendert sich je nach Router/Netz.
// RFC1918-private Adressbereiche sind vom oeffentlichen Internet aus
// nicht erreichbar/faelschbar, ein Angreifer kann also nie eine echte
// Anfrage mit einer solchen Origin an eine Website senden — Freigabe
// hier ist unbedenklich, gleiche Risikoklasse wie localhost.
const LOCAL_NETWORK_ORIGIN_RE =
  /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (ALLOWED_ORIGIN_SUFFIXES.some((s) => origin.endsWith(s))) return true
  if (ALLOWED_ORIGIN_PREFIXES.some((p) => origin.startsWith(p))) return true
  if (LOCAL_NETWORK_ORIGIN_RE.test(origin)) return true
  return false
}

/**
 * Liefert die CORS-Header fuer eine konkrete Anfrage. Muss PRO REQUEST
 * neu aufgerufen werden (z.B. ganz oben im Request-Handler) — niemals
 * einmalig auf Modulebene berechnen und wiederverwenden, da Edge-
 * Function-Instanzen mehrere gleichzeitige Anfragen bedienen koennen
 * und sich sonst Origin-Header verschiedener Requests vermischen wuerden.
 */
export function getCorsHeaders(origin: string | null) {
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
