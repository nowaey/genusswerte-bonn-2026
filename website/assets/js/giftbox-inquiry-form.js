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

  /* --- Anlass-Chips: füllen nur das bestehende Textfeld,
     kein eigener Formularwert nötig. --- */
  var anlassInput = document.getElementById('gb-anlass');
  var chips = form.querySelectorAll('.giftbox-chip');
  for (var c = 0; c < chips.length; c++) {
    chips[c].addEventListener('click', function () {
      var alreadyActive = this.classList.contains('is-active');
      for (var j = 0; j < chips.length; j++) { chips[j].classList.remove('is-active'); }
      if (alreadyActive) {
        anlassInput.value = '';
      } else {
        this.classList.add('is-active');
        anlassInput.value = this.textContent.trim();
      }
      anlassInput.focus();
    });
  }
  // Manuelle Eingabe hebt die Chip-Auswahl wieder auf, sobald sie nicht mehr passt.
  anlassInput.addEventListener('input', function () {
    for (var k = 0; k < chips.length; k++) {
      chips[k].classList.toggle('is-active', chips[k].textContent.trim() === anlassInput.value.trim());
    }
  });

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

    var nachricht = document.getElementById('gb-nachricht').value.trim();

    if (!document.getElementById('gb-name').value.trim()
        || !document.getElementById('gb-email').value.trim()
        || !nachricht) {
      showErr('MISSING_FIELDS');
      return;
    }

    /* Übergabe-Wahl und Grußkarten-Wunsch gibt es serverseitig
       nicht als eigenes Feld (kein Umbau der Edge Function nötig,
       kein neues System) — stattdessen als klar lesbare Zeilen
       vor die eigentliche Nachricht gesetzt, damit sie in der
       Anfrage-Mail sichtbar ankommen. */
    var fulfillmentInput = form.querySelector('input[name="fulfillment"]:checked');
    var extraLines = [];
    if (fulfillmentInput) { extraLines.push('Übergabe: ' + fulfillmentInput.value); }
    if (document.getElementById('gb-grusskarte').checked) { extraLines.push('Persönliche Grußkarte gewünscht: Ja'); }
    var fullMessage = extraLines.length ? (extraLines.join('\n') + '\n\n' + nachricht) : nachricht;

    var payload = {
      name:      document.getElementById('gb-name').value.trim(),
      email:     document.getElementById('gb-email').value.trim(),
      phone:     document.getElementById('gb-telefon').value.trim(),
      occasion:  document.getElementById('gb-anlass').value.trim(),
      budget:    document.getElementById('gb-budget').value.trim(),
      message:   fullMessage
    };

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
