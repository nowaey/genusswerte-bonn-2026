/* =========================================================
   MAIN.JS — Genusswerte Bonn
   Mobile nav · Sticky header · Smooth scroll · Scroll animations
   ========================================================= */

(function () {
  'use strict';

  /* --- Mobile Nav Toggle --------------------------------- */
  function initMobileNav() {
    var toggle = document.querySelector('.nav__toggle');
    var menu   = document.querySelector('.nav__menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var isOpen = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    // Close when a nav link is clicked (mobile)
    menu.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Sticky Header ------------------------------------ */
  function initStickyHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    function onScroll() {
      if (window.scrollY > 60) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Smooth Scroll for anchor links ------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        var headerHeight = document.querySelector('.site-header')
          ? document.querySelector('.site-header').offsetHeight
          : 0;
        var targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
        // Update URL without jump
        history.pushState(null, '', this.getAttribute('href'));
      });
    });
  }

  /* --- Page Intro Splash --------------------------------- */
  function initPageIntro() {
    var intro = document.getElementById('page-intro');
    if (!intro) return;

    // Nach 1s beginnt CSS-Transition das Overlay wegzublenden (via is-done)
    setTimeout(function () {
      intro.classList.add('is-done');
      // Nach vollständiger Transition aus dem DOM entfernen
      setTimeout(function () { intro.parentNode && intro.parentNode.removeChild(intro); }, 1600);
    }, 1000);
  }

  /* --- Scroll-Animationen (IntersectionObserver) -------- */
  function initScrollAnimations() {
    var elements = document.querySelectorAll('.js-animate');
    if (!elements.length || !window.IntersectionObserver) {
      // Fallback: alles sofort einblenden falls kein Observer-Support
      elements.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }

  /* --- Öffnungszeiten: heutigen Tag markieren ----------- */
  function initOpeningHoursToday() {
    var list = document.querySelector('[data-opening-hours]');
    if (!list) return;

    var today = new Date().getDay(); // 0 = Sonntag, 1 = Montag, ...
    var row = list.querySelector('.hours-list__row[data-day="' + today + '"]');
    if (!row) return;

    row.classList.add('is-today');
    row.setAttribute('aria-current', 'date');

    var dayEl = row.querySelector('.hours-list__day');
    if (dayEl && !row.querySelector('.hours-list__today-label')) {
      var label = document.createElement('span');
      label.className = 'hours-list__today-label';
      label.textContent = 'Heute';
      label.setAttribute('aria-hidden', 'true');
      dayEl.appendChild(label);
    }
  }

  /* --- Tasting Image Loop -------------------------------- */
  function initTastingLoop() {
    var slides = document.querySelectorAll('.tasting-loop__slide');
    if (slides.length < 2) return;

    var current = 0;

    setInterval(function () {
      slides[current].classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-active');
    }, 4500);
  }

  /* --- Event-Loop (gruppen-events.html, nur Mobile sichtbar) --
     Gleiches Prinzip wie initTastingLoop(), eigene Funktion statt
     Wiederverwendung, weil .tasting-loop__slide global selektiert
     (nicht auf einen Container beschränkt) — zwei unabhängige
     Loops mit derselben Klasse würden sich sonst eine gemeinsame
     Reihenfolge teilen statt getrennt zu laufen. -------------- */
  function initEventLoop() {
    var slides = document.querySelectorAll('.event-loop__slide');
    if (slides.length < 2) return;

    var current = 0;

    setInterval(function () {
      slides[current].classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-active');
    }, 4500);
  }

  /* --- Tasting Cards & Modal ----------------------------- */
  var EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  var MAX_PERSONS = 6;

  function formatPrice(value) {
    return EUR.format(value);
  }

  // HTML-escaped Titel, bei dem "&" in einen eigenen Span gewrappt wird
  // (Playfair Display rendert "&" sehr verschnörkelt — siehe .amp in base.css)
  function ampify(str) {
    var escaped = String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(/&amp;/g, '<span class="amp">&amp;</span>');
  }

  function renderTastingCards() {
    var grid = document.querySelector('[data-tasting-cards]');
    if (!grid || !window.GW_TASTINGS) return;

    /* Buchung pausiert? Dann statt des Modal-Buttons ein Link auf das
       externe Buchungssystem — gleiche CSS-Klassen, optisch identisch. */
    var cfg       = window.GW_CONFIG || {};
    var ext       = cfg.externalBooking || {};
    var extUrls   = ext.urls || {};
    var extLabel  = ext.buttonLabel || 'Tasting buchen';
    var bookingOn = cfg.bookingEnabled === true;

    var html = window.GW_TASTINGS.map(function (t, i) {
      var action;
      if (bookingOn) {
        action = '<button type="button" class="btn btn--secondary tasting-card__btn"'
               + ' data-tasting-open="' + t.id + '">Tasting-Gutschein kaufen</button>';
      } else if (extUrls[t.id]) {
        action = '<a href="' + extUrls[t.id] + '" target="_blank" rel="noopener noreferrer"'
               + ' class="btn btn--secondary tasting-card__btn"'
               + ' aria-label="' + t.title + ' buchen (öffnet in neuem Tab)">' + extLabel + '</a>';
      } else {
        /* Falls eine URL noch fehlt: nie ein toter Button */
        action = '<a href="kontakt.html" class="btn btn--secondary tasting-card__btn">Termin anfragen</a>';
      }

      return ''
        + '<article class="card tasting-card js-animate" data-delay="' + ((i % 3) + 1) + '" aria-label="' + t.title + '">'
        + '  <div class="card__image">'
        + '    <img src="' + t.image + '" alt="' + t.title + ' — Genusswerte Bonn" width="400" height="300" loading="lazy">'
        + '  </div>'
        + '  <div class="card__body">'
        + '    <span class="card__eyebrow">' + t.category + '</span>'
        + '    <h3 class="card__title">' + ampify(t.title) + '</h3>'
        + '    <p class="card__description">' + t.description + '</p>'
        + '    <p class="card__price">ab ' + formatPrice(t.pricePerPerson) + ' p. P.</p>'
        + '    <div class="card__action">'
        + '      ' + action
        + '    </div>'
        + '  </div>'
        + '</article>';
    }).join('');

    grid.innerHTML = html;

    // Cards in den Scroll-Animations-Observer einhängen
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      grid.querySelectorAll('.js-animate').forEach(function (el) { observer.observe(el); });
    } else {
      grid.querySelectorAll('.js-animate').forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  function initTastingModal() {
    /* Buchung pausiert: Modal bleibt komplett inaktiv. Die Karten
       rendern dann ohnehin keinen [data-tasting-open]-Button mehr —
       dies ist die zweite Absicherung. */
    if (!window.GW_CONFIG || window.GW_CONFIG.bookingEnabled !== true) return;

    var modal = document.getElementById('tasting-modal');
    if (!modal || !window.GW_TASTINGS) return;

    var state = { tasting: null, persons: 1 };

    var el = {
      category:    modal.querySelector('[data-modal-category]'),
      title:       modal.querySelector('[data-modal-title]'),
      description: modal.querySelector('[data-modal-description]'),
      duration:    modal.querySelector('[data-modal-duration]'),
      price:       modal.querySelector('[data-modal-price]'),
      count:       modal.querySelector('[data-modal-count]'),
      dec:         modal.querySelector('[data-modal-decrement]'),
      inc:         modal.querySelector('[data-modal-increment]'),
      sumTitle:    modal.querySelector('[data-summary-title]'),
      sumPersons:  modal.querySelector('[data-summary-persons]'),
      sumTotal:    modal.querySelector('[data-summary-total]'),
      buy:         modal.querySelector('[data-modal-buy]'),
      notice:      modal.querySelector('[data-modal-notice]'),
      close:       modal.querySelector('[data-modal-close]')
    };

    function updateStepperState() {
      if (state.persons > MAX_PERSONS) state.persons = MAX_PERSONS;
      if (state.persons < 1) state.persons = 1;
      el.count.textContent = state.persons;
      el.dec.disabled = state.persons <= 1;
      el.inc.disabled = state.persons >= MAX_PERSONS;
    }

    function updateSummary() {
      if (!state.tasting) return;
      el.sumTitle.textContent = state.tasting.title;
      el.sumPersons.textContent = state.persons + (state.persons === 1 ? ' Person' : ' Personen');
      el.sumTotal.textContent = formatPrice(state.tasting.pricePerPerson * state.persons);
    }

    function openFor(id) {
      var tasting = window.GW_TASTINGS.find(function (t) { return t.id === id; });
      if (!tasting) return;
      state.tasting = tasting;
      state.persons = 1;

      el.category.textContent = tasting.category;
      el.title.innerHTML = ampify(tasting.title);
      el.description.textContent = tasting.description;
      el.duration.textContent = tasting.duration;
      el.price.textContent = 'ab ' + formatPrice(tasting.pricePerPerson) + ' p. P.';

      updateStepperState();
      updateSummary();
      el.notice.hidden = true;
      el.buy.hidden = false;

      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
      document.body.classList.add('has-modal-open');
    }

    function closeModal() {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
      document.body.classList.remove('has-modal-open');
    }

    // Klick auf Card-Buttons
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-tasting-open]');
      if (trigger) {
        e.preventDefault();
        openFor(trigger.getAttribute('data-tasting-open'));
      }
    });

    // Stepper
    el.dec.addEventListener('click', function () {
      if (state.persons > 1) {
        state.persons--;
        updateStepperState();
        updateSummary();
      }
    });
    el.inc.addEventListener('click', function () {
      if (state.persons < MAX_PERSONS) {
        state.persons++;
        updateStepperState();
        updateSummary();
      }
    });

    // Schließen
    el.close.addEventListener('click', function (e) {
      e.preventDefault();
      closeModal();
    });
    modal.addEventListener('close', function () {
      document.body.classList.remove('has-modal-open');
    });
    // Backdrop-Click
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    // Kaufen-Button: startet Stripe Checkout via Edge Function
    el.buy.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.GW_checkout) {
        window.GW_checkout.createSession(state.tasting, state.persons);
      }
    });
  }

  /* --- Init on DOM ready -------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    initPageIntro();
    initMobileNav();
    initStickyHeader();
    initSmoothScroll();
    initScrollAnimations();
    initTastingLoop();
    initEventLoop();
    initOpeningHoursToday();
    renderTastingCards();
    initTastingModal();
    initCheckoutCancelledNotice();
  }

  /* --- Abgebrochener Stripe-Checkout ---------------------
     Stripe schickt bei Abbruch auf tastings.html?checkout=cancelled.
     Bisher wurde der Parameter nirgends ausgewertet — der Besucher
     landete kommentarlos wieder im Karten-Raster. Greift erst,
     wenn das eigene Buchungssystem wieder aktiv ist. */
  function initCheckoutCancelledNotice() {
    if (!window.GW_CONFIG || window.GW_CONFIG.bookingEnabled !== true) return;
    if (location.search.indexOf('checkout=cancelled') === -1) return;

    var host = document.querySelector('[data-tasting-cards]');
    if (!host || !host.parentNode) return;

    var p = document.createElement('p');
    p.className = 'noscript-fallback';
    p.setAttribute('role', 'status');
    p.textContent = 'Der Kauf wurde abgebrochen — es wurde nichts berechnet. '
                  + 'Du kannst jederzeit erneut starten.';
    host.parentNode.insertBefore(p, host);

    history.replaceState(null, '', location.pathname);
  }
})();
