/* =========================================================
   GROUP-INQUIRY-FORM.JS — Genusswerte Bonn
   Formular auf gruppen-events.html. Einzelner Schritt:
   POST an submit-group-inquiry → E-Mail per Resend an uns,
   Reply-To ist die Absender-Adresse.
   ========================================================= */

(function () {
  'use strict';

  var ERROR_MESSAGES = {
    MISSING_FIELDS: 'Bitte fülle alle Pflichtfelder aus.',
    INVALID_EMAIL:  'Bitte gib eine gültige E-Mail-Adresse ein.',
    INVALID_PERSONS: 'Bitte gib eine gültige Personenanzahl ein (1–500).',
    SEND_FAILED:    'Die Anfrage konnte nicht verschickt werden. Bitte versuch es gleich nochmal oder ruf uns an.',
    NETWORK:        'Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung.'
  };

  var form      = document.getElementById('group-inquiry-form');
  var stepEl    = document.getElementById('inquiry-form-step');
  var successEl = document.getElementById('inquiry-success');
  var errEl     = document.getElementById('inquiry-error');
  var btn       = document.getElementById('gi-submit');

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
      name:           document.getElementById('gi-name').value.trim(),
      email:          document.getElementById('gi-email').value.trim(),
      phone:          document.getElementById('gi-telefon').value.trim(),
      occasion:       document.getElementById('gi-anlass').value.trim(),
      persons:        parseInt(document.getElementById('gi-personen').value, 10),
      preferred_date: document.getElementById('gi-termin').value.trim(),
      message:        document.getElementById('gi-nachricht').value.trim()
    };

    if (!payload.name || !payload.email || !payload.occasion || !payload.message
        || !payload.persons || payload.persons < 1) {
      showErr('MISSING_FIELDS');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Wird gesendet …';

    fetch(apiBase() + '/submit-group-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.success) {
          stepEl.hidden = true;
          successEl.classList.add('is-visible');
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
