/* =========================================================
   CHECKOUT.JS — Genusswerte Bonn
   Tasting-Gutschein kaufen via Edge Function.
   Ruft create-checkout-session auf und leitet zu Stripe weiter.
   ========================================================= */

(function () {
  'use strict';

  window.GW_checkout = {
    createSession: function (tasting, persons) {
      var modal = document.getElementById('tasting-modal');
      var btn   = modal && modal.querySelector('[data-modal-buy]');
      var errEl = modal && modal.querySelector('[data-modal-error]');
      var base  = (window.GW_CONFIG && window.GW_CONFIG.apiBase) || '';

      if (!tasting || !tasting.tastingType) {
        if (errEl) { errEl.textContent = 'Ungültiges Tasting ausgewählt.'; errEl.hidden = false; }
        return;
      }

      if (btn)   { btn.disabled = true; btn.textContent = 'Bitte warten …'; }
      if (errEl) { errEl.hidden = true; }

      fetch(base + '/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type:  'tasting_voucher',
          tasting_type:  tasting.tastingType,
          persons:       persons
        })
      })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.url) {
          window.location.href = result.data.url;
        } else {
          showErr('Der Kauf konnte nicht gestartet werden. Bitte versuche es erneut.');
          reset();
        }
      })
      .catch(function () {
        showErr('Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung.');
        reset();
      });

      function reset() {
        if (btn) { btn.disabled = false; btn.textContent = 'Jetzt Gutschein kaufen'; }
      }

      function showErr(msg) {
        if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
      }
    }
  };

})();
