/* =========================================================
   CONFIG.JS — Genusswerte Bonn

   >>> HIER WIRD GESCHALTET <<<

   Diese Datei ist die Schaltzentrale. Um das eigene Gutschein-
   und Einlösesystem wieder zu aktivieren, reicht es,
   `bookingEnabled` auf true zu setzen und diese eine Datei
   hochzuladen. Sonst muss nichts angefasst werden.
   ========================================================= */

window.GW_CONFIG = {

  apiBase: 'https://dwreeykpjptfncjijjmg.supabase.co/functions/v1',

  /* ---------------------------------------------------------
     DER SCHALTER

     false = Buchung läuft über das externe Genusswerte-System
             (aktueller Zustand)
     true  = eigenes Gutscheinsystem mit Stripe-Checkout und
             Termin-Einlösung ist wieder aktiv

     Vor dem Umschalten auf true: vollständige Relaunch-Checkliste in
     PROJECT_CONTEXT.md befolgen (u. a. 5 Edge Functions mit fertigem
     Security-Fix-Code, die noch deployed werden müssen — nicht nur
     diese Datei hochladen und fertig).
     --------------------------------------------------------- */
  bookingEnabled: false,

  /* Externe Buchung — nur relevant solange bookingEnabled: false.
     Ein Link pro Tasting. Die Schlüssel sind die ids aus
     tastings-data.js. Ein leerer Wert ('') fällt automatisch auf
     kontakt.html zurück, damit nie ein toter Button entsteht. */
  externalBooking: {
    buttonLabel: 'Tasting buchen',
    urls: {
      wein:       'https://genusswerte.com/shop/products/detail/wein-tasting/',
      afterwork:  'https://genusswerte.com/shop/products/detail/afterwork-wein-tasting/',
      gin:        'https://genusswerte.com/shop/products/detail/gin-tasting/',
      champagner: 'https://genusswerte.com/shop/products/detail/champagner-popcorn-tasting/',
      trueffel:   'https://genusswerte.com/shop/products/detail/trueffel-champagner-tasting/',
      whisky:     'https://genusswerte.com/shop/products/detail/whisky-tasting/',
      craftbeer:  'https://genusswerte.com/shop/products/detail/craft-beer-tasting/',
      wagyu:      'https://genusswerte.com/shop/products/detail/wagyu-wein-champagner-tasting/',
      apero:      'https://genusswerte.com/shop/products/detail/apero-antipasti-tasting/'
    }
  }
};

/* ---------------------------------------------------------
   Bootstrap — läuft sofort im <head>, vor dem ersten Rendern.

   Hängt den Zustand als Klasse an <html>, damit das CSS die
   passenden Elemente ausblenden kann, BEVOR sie sichtbar
   werden. Würde das erst am Seitenende laufen, blitzten die
   ausgeblendeten Links kurz auf.
   --------------------------------------------------------- */
(function () {
  var on = window.GW_CONFIG.bookingEnabled === true;
  document.documentElement.className += on ? ' gw-booking-on' : ' gw-booking-off';

  /* Solange pausiert: Einlöseseite aus dem Suchindex halten.
     Fällt beim Zurückschalten automatisch weg — nichts zu vergessen. */
  if (!on && /gutschein-einloesen/.test(location.pathname)) {
    var m = document.createElement('meta');
    m.setAttribute('name', 'robots');
    m.setAttribute('content', 'noindex, nofollow');
    document.head.appendChild(m);
  }
})();
