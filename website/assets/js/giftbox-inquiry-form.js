/* =========================================================
   GIFTBOX-INQUIRY-FORM.JS — Genusswerte Bonn
   Formular auf geschenkboxen.html. Einzelner Schritt:
   POST an submit-giftbox-inquiry → E-Mail per Resend an uns,
   Reply-To ist die Absender-Adresse.

   Fast identisch zu group-inquiry-form.js (bewusst — gleiches
   Muster, andere Felder/Endpunkt).
   ========================================================= */

(function () {
  'use strict';

  var ERROR_MESSAGES = {
    MISSING_FIELDS: 'Bitte fülle alle Pflichtfelder aus.',
    INVALID_EMAIL:  'Bitte gib eine gültige E-Mail-Adresse ein.',
    SEND_FAILED:    'Die Anfrage konnte nicht verschickt werden. Bitte versuch es gleich nochmal oder ruf uns an.',
    RATE_LIMITED:   'Gerade zu viele Anfragen. Bitte versuch es in etwas später nochmal oder ruf uns direkt an.',
    NETWORK:        'Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung.'
  };

  var form      = document.getElementById('giftbox-inquiry-form');
  var stepEl    = document.getElementById('inquiry-form-step');
  var successEl = document.getElementById('inquiry-success');
  var errEl     = document.getElementById('inquiry-error');
  var btn       = document.getElementById('gb-submit');

  if (!form) return;

  function apiBase() {
    return (window.GW_CONFIG && window.GW_CONFIG.apiBase) || '';
  }

  function showErr(key) {
    errEl.textContent = ERROR_MESSAGES[key] || ERROR_MESSAGES.SEND_FAILED;
    errEl.hidden = false;
  }

  function clearErr() {
    errEl.hidden = true;
    errEl.textContent = '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErr();

    var payload = {
      name:      document.getElementById('gb-name').value.trim(),
      email:     document.getElementById('gb-email').value.trim(),
      phone:     document.getElementById('gb-telefon').value.trim(),
      occasion:  document.getElementById('gb-anlass').value.trim(),
      budget:    document.getElementById('gb-budget').value.trim(),
      message:   document.getElementById('gb-nachricht').value.trim()
    };

    if (!payload.name || !payload.email || !payload.message) {
      showErr('MISSING_FIELDS');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Wird gesendet …';

    fetch(apiBase() + '/submit-giftbox-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.success) {
          stepEl.hidden = true;
          successEl.classList.add('is-visible');
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (result.status === 429) {
          showErr('RATE_LIMITED');
          reset();
        } else {
          showErr(result.data && result.data.error);
          reset();
        }
      })
      .catch(function () {
        showErr('NETWORK');
        reset();
      });

    function reset() {
      btn.disabled = false;
      btn.textContent = 'Anfrage senden';
    }
  });

})();
