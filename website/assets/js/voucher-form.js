/* =========================================================
   VOUCHER-FORM.JS — Genusswerte Bonn
   3-Schritt Gutschein-Einlösung:
   1. validate-voucher  → Code prüfen
   2. get-available-slots → Kalender + Terminwahl
   3. schedule-voucher  → Termin verbindlich buchen
   ========================================================= */

(function () {
  'use strict';

  var ERROR_MESSAGES = {
    VOUCHER_NOT_FOUND:        'Dieser Code ist uns nicht bekannt. Bitte prüfe die Schreibweise.',
    VOUCHER_NOT_ACTIVE:       'Dieser Gutschein ist nicht mehr aktiv.',
    VOUCHER_EXPIRED:          'Dieser Gutschein ist leider abgelaufen.',
    VOUCHER_ALREADY_RESERVED: 'Für diesen Gutschein ist bereits ein Termin reserviert.',
    SLOT_NO_CAPACITY:         'Dieser Termin ist leider gerade ausgebucht worden. Bitte wähle einen anderen.',
    SLOT_NOT_FOUND:           'Der gewählte Termin wurde nicht gefunden. Bitte wähle einen anderen.',
    SLOT_TOO_SOON:            'Für so kurzfristige Termine ist leider keine Buchung mehr möglich. Bitte wähle einen Termin ab übermorgen.',
    INVALID_VOUCHER_CODE:     'Bitte gib einen gültigen Gutscheincode ein.',
    TASTING_SLUG_MISSING:     'Diesem Gutschein ist kein Tasting zugeordnet. Bitte wende dich an uns.'
  };

  var MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var WEEKDAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

  /* --- State --------------------------------------------- */
  var state = {
    code:        null,
    tastingName: null,
    persons:     null,
    slotId:      null,
    slotLabel:   null
  };

  /* --- DOM ----------------------------------------------- */
  var step1       = document.getElementById('step-1');
  var step2       = document.getElementById('step-2');
  var step3       = document.getElementById('step-3');
  var successEl   = document.getElementById('form-success');

  var codeInput   = document.getElementById('gutschein-code');
  var btnValidate = document.getElementById('btn-validate');
  var validateErr = document.getElementById('validate-error');

  var slotsEl     = document.getElementById('slots-list');
  var slotsErr    = document.getElementById('slots-error');
  var voucherInfo = document.getElementById('voucher-info');

  var scheduleForm  = document.getElementById('schedule-form');
  var scheduleErr   = document.getElementById('schedule-error');
  var chosenSlotEl  = document.getElementById('chosen-slot-info');
  var successBody   = document.getElementById('success-body');

  if (!btnValidate) return;

  /* --- Helpers ------------------------------------------- */
  function apiBase() {
    return (window.GW_CONFIG && window.GW_CONFIG.apiBase) || '';
  }

  function errMsg(code) {
    return ERROR_MESSAGES[code] || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
  }

  function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function hideErr(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  function setBusy(btn, busy, idleText) {
    btn.disabled = busy;
    btn.textContent = busy ? 'Bitte warten …' : idleText;
  }

  function goTo(from, to) {
    if (from) from.hidden = true;
    if (to)   to.hidden   = false;
    if (to)   to.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =========================================================
     SCHRITT 1 — Gutschein validieren
     ========================================================= */
  if (codeInput) {
    codeInput.addEventListener('input', function () {
      var pos = codeInput.selectionStart;
      codeInput.value = codeInput.value.toUpperCase();
      try { codeInput.setSelectionRange(pos, pos); } catch (e) {}
    });
    codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); btnValidate.click(); }
    });
  }

  btnValidate.addEventListener('click', function () {
    var code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    hideErr(validateErr);

    if (!code) {
      showErr(validateErr, 'Bitte gib deinen Gutscheincode ein.');
      if (codeInput) codeInput.focus();
      return;
    }

    setBusy(btnValidate, true, 'Gutschein prüfen');

    fetch(apiBase() + '/validate-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucher_code: code })
    })
    .then(function (res) {
      return res.json().then(function (d) { return { ok: res.ok, data: d }; });
    })
    .then(function (result) {
      setBusy(btnValidate, false, 'Gutschein prüfen');

      if (result.ok && result.data.valid) {
        state.code        = code;
        state.tastingName = result.data.tasting_name || 'Tasting-Gutschein';
        state.persons     = result.data.persons      || 1;

        if (voucherInfo) {
          voucherInfo.innerHTML =
            '<p class="voucher-info__title">' + state.tastingName + '</p>'
            + '<p class="voucher-info__meta">Für '
            + state.persons
            + (state.persons === 1 ? ' Person' : ' Personen') + '</p>';
        }

        goTo(step1, step2);
        loadSlots();

      } else {
        var errCode = (result.data && result.data.error) ? result.data.error : 'UNKNOWN';
        showErr(validateErr, errMsg(errCode));
      }
    })
    .catch(function () {
      setBusy(btnValidate, false, 'Gutschein prüfen');
      showErr(validateErr, 'Verbindung fehlgeschlagen. Bitte versuche es erneut.');
    });
  });

  /* =========================================================
     SCHRITT 2 — Slots laden & Kalender rendern
     ========================================================= */
  function loadSlots() {
    hideErr(slotsErr);
    if (!slotsEl) return;
    slotsEl.innerHTML = '<p class="slots-loading">Verfügbare Termine werden geladen …</p>';

    fetch(apiBase() + '/get-available-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucher_code: state.code })
    })
    .then(function (res) {
      return res.json().then(function (d) { return { ok: res.ok, data: d }; });
    })
    .then(function (result) {
      if (!result.ok) {
        slotsEl.innerHTML = '';
        showErr(slotsErr, errMsg(result.data && result.data.error));
        return;
      }

      var slots = Array.isArray(result.data) ? result.data : [];

      if (!slots.length) {
        slotsEl.innerHTML =
          '<div class="slots-empty">'
          + 'Aktuell sind keine Termine verfügbar.<br>'
          + 'Melde dich direkt bei uns — wir finden gemeinsam einen Termin.'
          + '</div>';
        return;
      }

      renderCalendar(slotsEl, slots, function (slotId, slotLabel) {
        state.slotId    = slotId;
        state.slotLabel = slotLabel;

        if (chosenSlotEl) {
          chosenSlotEl.innerHTML =
            '<p class="voucher-info__title">Gewählter Termin</p>'
            + '<p class="voucher-info__meta">' + slotLabel + '</p>';
        }

        setTimeout(function () { goTo(step2, step3); }, 200);
      });
    })
    .catch(function () {
      slotsEl.innerHTML = '';
      showErr(slotsErr, 'Verbindung fehlgeschlagen. Bitte versuche es erneut.');
    });
  }

  /* =========================================================
     KALENDER-RENDERER
     ========================================================= */
  function renderCalendar(container, slots, onSelect) {
    // Slots nach Datum gruppieren
    var byDate = {};
    slots.forEach(function (s) {
      if (!byDate[s.slot_date]) byDate[s.slot_date] = [];
      byDate[s.slot_date].push(s);
    });

    var allDates = Object.keys(byDate).sort();
    var p0       = allDates[0].split('-');
    var curYear  = +p0[0];
    var curMonth = +p0[1] - 1;   // 0-basiert
    var selDate  = null;

    function hasSlotInMonth(y, m) {
      var mo = m < 0 ? 11 : (m > 11 ? 0 : m);
      var yr = m < 0 ? y - 1 : (m > 11 ? y + 1 : y);
      return allDates.some(function (d) {
        var p = d.split('-');
        return +p[0] === yr && +p[1] - 1 === mo;
      });
    }

    function draw() {
      var todayRaw = new Date();
      var today    = new Date(Date.UTC(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate()));

      var firstDay   = new Date(Date.UTC(curYear, curMonth, 1));
      var daysInMon  = new Date(Date.UTC(curYear, curMonth + 1, 0)).getDate();
      var startDow   = (firstDay.getUTCDay() + 6) % 7; // Mo=0 … So=6

      var canPrev = hasSlotInMonth(curYear, curMonth - 1);
      var canNext = hasSlotInMonth(curYear, curMonth + 1);

      var html = '<div class="slot-calendar">';

      /* Navigation */
      html += '<div class="slot-cal__nav">';
      html += '<button type="button" class="slot-cal__arrow"'
        + (canPrev ? '' : ' disabled') + ' data-dir="-1" aria-label="Vorheriger Monat">&#8249;</button>';
      html += '<span class="slot-cal__month-label">' + MONTHS[curMonth] + ' ' + curYear + '</span>';
      html += '<button type="button" class="slot-cal__arrow"'
        + (canNext ? '' : ' disabled') + ' data-dir="1" aria-label="Nächster Monat">&#8250;</button>';
      html += '</div>';

      /* Wochentag-Header */
      html += '<div class="slot-cal__grid">';
      WEEKDAYS.forEach(function (d) {
        html += '<div class="slot-cal__weekday">' + d + '</div>';
      });

      /* Leerzellen vor dem 1. */
      for (var i = 0; i < startDow; i++) {
        html += '<span class="slot-cal__day" aria-hidden="true"></span>';
      }

      /* Tage */
      for (var day = 1; day <= daysInMon; day++) {
        var ds   = curYear + '-'
          + String(curMonth + 1).padStart(2, '0') + '-'
          + String(day).padStart(2, '0');
        var ts   = new Date(Date.UTC(curYear, curMonth, day));
        var avail = !!byDate[ds];
        var isSel = selDate === ds;
        var isTd  = ts.getTime() === today.getTime();

        var cls = 'slot-cal__day';
        if (avail) cls += ' slot-cal__day--avail';
        if (isSel) cls += ' slot-cal__day--sel';
        if (isTd)  cls += ' slot-cal__day--today';

        if (avail) {
          html += '<button type="button" class="' + cls + '" data-date="' + ds + '"'
            + ' aria-label="' + day + '. ' + MONTHS[curMonth] + '">'
            + '<span class="slot-cal__day-num">' + day + '</span>'
            + '<span class="slot-cal__day-dot" aria-hidden="true"></span>'
            + '</button>';
        } else {
          html += '<span class="' + cls + '" aria-hidden="true">'
            + '<span class="slot-cal__day-num">' + day + '</span></span>';
        }
      }

      html += '</div>'; /* .slot-cal__grid */

      /* Legende */
      html += '<div class="slot-cal__legend">'
        + '<span class="slot-cal__legend-dot"></span>'
        + 'Verfügbarer Termin'
        + '</div>';

      html += '</div>'; /* .slot-calendar */

      /* Uhrzeit-Panel für gewählten Tag */
      if (selDate && byDate[selDate]) {
        var dateObj   = new Date(selDate + 'T00:00:00');
        var formatted = dateObj.toLocaleDateString('de-DE', {
          weekday: 'long', day: 'numeric', month: 'long'
        });
        var daySlots  = byDate[selDate].slice().sort(function (a, b) {
          return a.slot_time < b.slot_time ? -1 : 1;
        });

        html += '<div class="slot-times">';
        html += '<p class="slot-times__label"><strong>' + formatted + '</strong>&ensp;— Uhrzeit wählen</p>';
        html += '<div class="slot-times__chips">';

        daySlots.forEach(function (s) {
          var label = formatted + ' · ' + s.slot_time + ' Uhr';
          html += '<button type="button" class="slot-times__chip"'
            + ' data-slot-id="'    + s.slot_id    + '"'
            + ' data-slot-label="' + label.replace(/"/g, '&quot;') + '">'
            + '<span class="chip-time">'  + s.slot_time + ' Uhr</span>'
            + '<span class="chip-seats">' + s.available_seats + ' Plätze frei</span>'
            + '</button>';
        });

        html += '</div></div>'; /* chips + slot-times */
      }

      container.innerHTML = html;

      /* Monat-Navigation */
      container.querySelectorAll('[data-dir]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          curMonth += +btn.getAttribute('data-dir');
          if (curMonth < 0)  { curMonth = 11; curYear--; }
          if (curMonth > 11) { curMonth = 0;  curYear++; }
          draw();
        });
      });

      /* Tag anklicken */
      container.querySelectorAll('[data-date]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var d = btn.getAttribute('data-date');
          selDate = selDate === d ? null : d;
          draw();
        });
      });

      /* Uhrzeit wählen */
      container.querySelectorAll('[data-slot-id]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          onSelect(
            chip.getAttribute('data-slot-id'),
            chip.getAttribute('data-slot-label')
          );
        });
      });
    }

    draw();
  }

  /* --- Zurück-Buttons ------------------------------------ */
  var btnBack1 = document.getElementById('btn-back-1');
  if (btnBack1) {
    btnBack1.addEventListener('click', function () { goTo(step2, step1); });
  }

  var btnBack2 = document.getElementById('btn-back-2');
  if (btnBack2) {
    btnBack2.addEventListener('click', function () {
      state.slotId    = null;
      state.slotLabel = null;
      goTo(step3, step2);
    });
  }

  /* =========================================================
     SCHRITT 3 — Termin buchen
     ========================================================= */
  if (scheduleForm) {

    scheduleForm.querySelectorAll('.form-input').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.value.trim()) field.classList.remove('is-invalid');
      });
    });

    scheduleForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideErr(scheduleErr);

      var valid = true;
      scheduleForm.querySelectorAll('[required]').forEach(function (field) {
        field.classList.remove('is-invalid');
        if (!field.value.trim()) {
          field.classList.add('is-invalid');
          valid = false;
        }
      });

      var emailEl = document.getElementById('s-email');
      if (emailEl && emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
        emailEl.classList.add('is-invalid');
        valid = false;
      }

      if (!valid) {
        showErr(scheduleErr, 'Bitte fülle alle Pflichtfelder korrekt aus.');
        return;
      }

      if (!state.slotId) {
        showErr(scheduleErr, 'Kein Termin gewählt. Bitte gehe zurück und wähle einen Termin.');
        return;
      }

      var submitBtn  = scheduleForm.querySelector('[type="submit"]');
      var nameEl     = document.getElementById('s-name');
      var telefonEl  = document.getElementById('s-telefon');
      var adresseEl  = document.getElementById('s-adresse');

      setBusy(submitBtn, true, 'Termin verbindlich buchen');

      fetch(apiBase() + '/schedule-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_code:     state.code,
          slot_id:          state.slotId,
          customer_name:    nameEl    ? nameEl.value.trim()    : '',
          customer_email:   emailEl   ? emailEl.value.trim()   : '',
          customer_phone:   telefonEl ? telefonEl.value.trim() : '',
          customer_address: adresseEl ? adresseEl.value.trim() : ''
        })
      })
      .then(function (res) {
        return res.json().then(function (d) { return { ok: res.ok, data: d }; });
      })
      .then(function (result) {
        setBusy(submitBtn, false, 'Termin verbindlich buchen');

        if (result.ok && result.data && result.data.success) {
          showSuccess();
        } else {
          var errCode = (result.data && result.data.error) ? result.data.error : 'UNKNOWN';
          showErr(scheduleErr, errMsg(errCode));

          if (errCode === 'SLOT_NO_CAPACITY') {
            setTimeout(function () {
              hideErr(scheduleErr);
              goTo(step3, step2);
              loadSlots();
            }, 2500);
          }
        }
      })
      .catch(function () {
        setBusy(submitBtn, false, 'Termin verbindlich buchen');
        showErr(scheduleErr, 'Verbindung fehlgeschlagen. Bitte versuche es erneut.');
      });
    });
  }

  function showSuccess() {
    if (step1) step1.hidden = true;
    if (step2) step2.hidden = true;
    if (step3) step3.hidden = true;

    if (successBody && state.slotLabel) {
      successBody.textContent =
        'Dein Termin am ' + state.slotLabel
        + ' ist bestätigt. Du erhältst in Kürze eine Bestätigung per E-Mail.';
    }

    if (successEl) {
      successEl.classList.add('is-visible');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

})();
