/* =========================================================
   GUTSCHEINE-BOXEN.JS — Genusswerte Bonn
   "Bestellen"-Buttons auf gutscheine-boxen.html.

   Vorher als Inline-onclick im HTML — hierher ausgelagert, damit
   eine strikte Content-Security-Policy (script-src 'self', ohne
   'unsafe-inline') die Seite nicht blockiert. Gleiches Verhalten,
   nur per addEventListener statt onclick-Attribut, konsistent mit
   dem Rest der Seite (main.js, voucher-form.js, ...).
   ========================================================= */

(function () {
  'use strict';

  var note = document.getElementById('order-note');
  if (!note) return;

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn--order');
    if (!btn) return;

    var box = btn.getAttribute('data-box') || 'diese Box';
    note.innerHTML =
      '<strong>Onlineshop kommt bald!</strong> ' +
      'Für "' + box + '" kontaktiere uns telefonisch unter ' +
      '<a href="tel:+4922825908928" style="color:var(--color-green);font-weight:600;text-decoration:underline;">+49 228 2590 8928</a> ' +
      'oder komm einfach im Laden vorbei.';
    note.style.display = 'block';
    note.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
