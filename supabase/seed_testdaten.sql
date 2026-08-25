-- ============================================================
-- supabase/seed_testdaten.sql
-- Genusswerte Bonn — Testdaten für Entwicklung & Admin Panel
--
-- ⚠️  NUR FÜR ENTWICKLUNG UND TEST — NIEMALS IN PRODUKTION!
--
-- Ausführung im Supabase SQL Editor als eingeloggter Datenbank-User.
-- Das Script ist idempotent: Bestehende Testdaten werden vorher
-- sauber gelöscht (Erkennungsmerkmal: @test.genusswerte.de).
--
-- Inhalt nach Ausführung:
--   Kunden:          3 (Max Mustermann, Erika Musterfrau, Lisa Testerin)
--   Bestellungen:    4 (3× Tasting bezahlt, 1× Genussbox bezahlt)
--   Gutscheine:      3 (active / scheduled / checked_in)
--   Tasting-Slots:   7 (4× Gin, 2× Wein, 1× Whisky)
--   Reservierungen:  2 (Wein → scheduled, Whisky → checked_in)
--
-- Test-Voucher-Codes:
--   GW-GIN-2026-SEED0001  (aktiv, noch nicht reserviert)
--   GW-WT-2026-SEED0002   (scheduled, Termin in ~10 Tagen)
--   GW-WH-2026-SEED0003   (checked_in, abgeschlossenes Tasting)
-- ============================================================


-- ----------------------------------------------------------
-- Schritt 0: Bestehende Testdaten bereinigen
-- Reihenfolge: abhängige Tabellen zuerst (FK-Constraints)
-- ----------------------------------------------------------

DELETE FROM voucher_reservations vr
USING vouchers v, customers c
WHERE vr.voucher_id = v.id
  AND v.customer_id = c.id
  AND c.email LIKE '%@test.genusswerte.de';

DELETE FROM vouchers v
USING customers c
WHERE v.customer_id = c.id
  AND c.email LIKE '%@test.genusswerte.de';

DELETE FROM order_items oi
USING orders o, customers c
WHERE oi.order_id = o.id
  AND o.customer_id = c.id
  AND c.email LIKE '%@test.genusswerte.de';

DELETE FROM orders o
USING customers c
WHERE o.customer_id = c.id
  AND c.email LIKE '%@test.genusswerte.de';

DELETE FROM tasting_slots
WHERE notes LIKE '[SEED]%';

DELETE FROM customers
WHERE email LIKE '%@test.genusswerte.de';


-- ----------------------------------------------------------
-- Schritt 1–6: Testdaten einfügen
-- ----------------------------------------------------------

DO $$
DECLARE
  -- Kunden
  v_max       uuid;
  v_erika     uuid;
  v_lisa      uuid;

  -- Bestellungen
  v_ord_gin     uuid;
  v_ord_wein    uuid;
  v_ord_whisky  uuid;
  v_ord_box     uuid;

  -- Gutscheine
  v_vou_gin     uuid;
  v_vou_wein    uuid;
  v_vou_whisky  uuid;

  -- Tasting-Slots
  v_slot_gin1    uuid;
  v_slot_gin2    uuid;
  v_slot_gin3    uuid;
  v_slot_gin4    uuid;
  v_slot_wein1   uuid;
  v_slot_wein2   uuid;
  v_slot_whisky1 uuid;

BEGIN

  -- --------------------------------------------------------
  -- Kunden
  -- --------------------------------------------------------

  INSERT INTO customers (name, email, phone)
  VALUES ('Max Mustermann', 'max.mustermann@test.genusswerte.de', '0228 111 222 333')
  RETURNING id INTO v_max;

  INSERT INTO customers (name, email, phone)
  VALUES ('Erika Musterfrau', 'erika.musterfrau@test.genusswerte.de', '0228 444 555 666')
  RETURNING id INTO v_erika;

  INSERT INTO customers (name, email, phone, address)
  VALUES (
    'Lisa Testerin',
    'lisa.testerin@test.genusswerte.de',
    '0228 777 888 999',
    'Musterstraße 12, 53115 Bonn'
  )
  RETURNING id INTO v_lisa;


  -- --------------------------------------------------------
  -- Bestellungen & Order Items
  -- --------------------------------------------------------

  -- 1. Gin Tasting — bezahlt (Max)
  INSERT INTO orders (
    customer_id, order_type, payment_status,
    total_amount, stripe_payment_intent_id, stripe_session_id
  )
  VALUES (
    v_max, 'tasting_voucher', 'paid',
    75.00, 'pi_test_gin_max_001', 'cs_test_gin_max_001'
  )
  RETURNING id INTO v_ord_gin;

  INSERT INTO order_items (order_id, product_name, tasting_type, quantity, unit_price)
  VALUES (v_ord_gin, 'Gin Tasting für 2 Personen', 'gin_tasting', 1, 75.00);


  -- 2. Wein Tasting — bezahlt (Lisa)
  INSERT INTO orders (
    customer_id, order_type, payment_status,
    total_amount, stripe_payment_intent_id, stripe_session_id
  )
  VALUES (
    v_lisa, 'tasting_voucher', 'paid',
    90.00, 'pi_test_wein_lisa_001', 'cs_test_wein_lisa_001'
  )
  RETURNING id INTO v_ord_wein;

  INSERT INTO order_items (order_id, product_name, tasting_type, quantity, unit_price)
  VALUES (v_ord_wein, 'Wein Tasting für 2 Personen', 'wein_tasting', 1, 90.00);


  -- 3. Whisky Tasting — bezahlt (Max, zweite Bestellung)
  INSERT INTO orders (
    customer_id, order_type, payment_status,
    total_amount, stripe_payment_intent_id, stripe_session_id
  )
  VALUES (
    v_max, 'tasting_voucher', 'paid',
    85.00, 'pi_test_whisky_max_001', 'cs_test_whisky_max_001'
  )
  RETURNING id INTO v_ord_whisky;

  INSERT INTO order_items (order_id, product_name, tasting_type, quantity, unit_price)
  VALUES (v_ord_whisky, 'Whisky Tasting für 2 Personen', 'whisky_tasting', 1, 85.00);


  -- 4. Genussbox Classic — bezahlt, Lieferung offen (Erika)
  INSERT INTO orders (
    customer_id, order_type, payment_status, fulfillment_status,
    total_amount, stripe_payment_intent_id
  )
  VALUES (
    v_erika, 'gift_box', 'paid', 'open',
    49.00, 'pi_test_box_erika_001'
  )
  RETURNING id INTO v_ord_box;

  INSERT INTO order_items (order_id, product_name, tasting_type, quantity, unit_price)
  VALUES (v_ord_box, 'Genussbox Bonn Classic', NULL, 1, 49.00);


  -- --------------------------------------------------------
  -- Gutscheine
  -- --------------------------------------------------------

  -- Gin-Gutschein: aktiv — noch nicht reserviert
  -- → Testen: VouchersPage Status-Filter "active", Check-in-Button sichtbar? Nein.
  INSERT INTO vouchers (
    voucher_code, order_id, customer_id,
    tasting_type, persons, status, valid_until
  )
  VALUES (
    'GW-GIN-2026-SEED0001', v_ord_gin, v_max,
    'gin_tasting', 2, 'active', '2027-12-31'
  )
  RETURNING id INTO v_vou_gin;

  -- Wein-Gutschein: Termin reserviert (scheduled)
  -- → Testen: Check-in-Button sichtbar, Reservierung in ReservationsPage
  INSERT INTO vouchers (
    voucher_code, order_id, customer_id,
    tasting_type, persons, status, valid_until
  )
  VALUES (
    'GW-WT-2026-SEED0002', v_ord_wein, v_lisa,
    'wein_tasting', 2, 'scheduled', '2027-12-31'
  )
  RETURNING id INTO v_vou_wein;

  -- Whisky-Gutschein: eingecheckt (checked_in) — Tasting abgeschlossen
  -- → Testen: Status-Filter "checked_in", kein aktiver Button
  INSERT INTO vouchers (
    voucher_code, order_id, customer_id,
    tasting_type, persons, status, valid_until
  )
  VALUES (
    'GW-WH-2026-SEED0003', v_ord_whisky, v_max,
    'whisky_tasting', 2, 'checked_in', '2027-12-31'
  )
  RETURNING id INTO v_vou_whisky;


  -- --------------------------------------------------------
  -- Gin-Tasting-Slots (4 verschiedene Zustände)
  -- --------------------------------------------------------

  -- Slot 1: nächste Woche, komplett frei
  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'gin_tasting', CURRENT_DATE + 7, '19:00',
    8, 0, 'active', '[SEED] Gin Tasting — 7 Tage, voll verfügbar'
  )
  RETURNING id INTO v_slot_gin1;

  -- Slot 2: in 2 Wochen, halb belegt
  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'gin_tasting', CURRENT_DATE + 14, '19:00',
    8, 4, 'active', '[SEED] Gin Tasting — 14 Tage, noch 4 Plätze frei'
  )
  RETURNING id INTO v_slot_gin2;

  -- Slot 3: in 3 Wochen, AUSGEBUCHT (status = full)
  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'gin_tasting', CURRENT_DATE + 21, '19:00',
    8, 8, 'full', '[SEED] Gin Tasting — 21 Tage, AUSGEBUCHT'
  )
  RETURNING id INTO v_slot_gin3;

  -- Slot 4: vergangen, abgesagt (zeigt sich nicht in v_slot_availability)
  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'gin_tasting', CURRENT_DATE - 14, '19:00',
    8, 0, 'cancelled', '[SEED] Gin Tasting — 14 Tage her, abgesagt'
  )
  RETURNING id INTO v_slot_gin4;


  -- --------------------------------------------------------
  -- Wein-Tasting-Slots (2 Stück)
  -- --------------------------------------------------------

  -- Slot 1: in 10 Tagen — hier ist Lisas Reservierung
  -- capacity_reserved = 2 = Lisa's voucher.persons → konsistent
  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'wein_tasting', CURRENT_DATE + 10, '18:30',
    10, 2, 'active', '[SEED] Wein Tasting — Lisas reservierter Termin'
  )
  RETURNING id INTO v_slot_wein1;

  -- Slot 2: in 4 Wochen, noch frei
  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'wein_tasting', CURRENT_DATE + 28, '18:30',
    10, 0, 'active', '[SEED] Wein Tasting — weiterer Termin, frei'
  )
  RETURNING id INTO v_slot_wein2;


  -- --------------------------------------------------------
  -- Whisky-Tasting-Slot (vergangener Termin, wurde abgehalten)
  -- capacity_reserved = 2 = Max' voucher.persons → konsistent
  -- --------------------------------------------------------

  INSERT INTO tasting_slots (
    tasting_type, slot_date, slot_time,
    capacity_total, capacity_reserved, status, notes
  )
  VALUES (
    'whisky_tasting', CURRENT_DATE - 7, '19:30',
    6, 2, 'active', '[SEED] Whisky Tasting — vor 7 Tagen, wurde abgehalten'
  )
  RETURNING id INTO v_slot_whisky1;


  -- --------------------------------------------------------
  -- Reservierungen
  -- --------------------------------------------------------

  -- Lisas Wein-Gutschein → Wein-Slot 1 (Termin in ~10 Tagen)
  INSERT INTO voucher_reservations (
    voucher_id, slot_id,
    customer_name, customer_email, customer_phone,
    customer_address, notes
  )
  VALUES (
    v_vou_wein, v_slot_wein1,
    'Lisa Testerin',
    'lisa.testerin@test.genusswerte.de',
    '0228 777 888 999',
    'Musterstraße 12, 53115 Bonn',
    'Bitte Plätze nebeneinander reservieren'
  );

  -- Max' Whisky-Gutschein → Whisky-Slot (vergangener Termin, checked_in)
  INSERT INTO voucher_reservations (
    voucher_id, slot_id,
    customer_name, customer_email, customer_phone, notes
  )
  VALUES (
    v_vou_whisky, v_slot_whisky1,
    'Max Mustermann',
    'max.mustermann@test.genusswerte.de',
    '0228 111 222 333',
    'Sehr schöner Abend — Gast hat eingecheckt'
  );


  -- --------------------------------------------------------
  -- Abschluss-Ausgabe
  -- --------------------------------------------------------

  RAISE NOTICE '';
  RAISE NOTICE '✓ Testdaten erfolgreich angelegt:';
  RAISE NOTICE '  Kunden:          3 (Max Mustermann, Erika Musterfrau, Lisa Testerin)';
  RAISE NOTICE '  Bestellungen:    4 (3× Tasting paid, 1× Genussbox paid)';
  RAISE NOTICE '  Gutscheine:      3 (active / scheduled / checked_in)';
  RAISE NOTICE '  Tasting-Slots:   7 (4× Gin, 2× Wein, 1× Whisky)';
  RAISE NOTICE '  Reservierungen:  2 (Wein scheduled, Whisky checked_in)';
  RAISE NOTICE '';
  RAISE NOTICE '  Test-Voucher-Codes:';
  RAISE NOTICE '    GW-GIN-2026-SEED0001  — aktiv, noch nicht reserviert';
  RAISE NOTICE '    GW-WT-2026-SEED0002   — scheduled, Wein-Termin in ~10 Tagen';
  RAISE NOTICE '    GW-WH-2026-SEED0003   — checked_in, Whisky-Tasting abgeschlossen';
  RAISE NOTICE '';
  RAISE NOTICE '⚠ Hinweis: total_amount ist hier in Euro gespeichert (75.00 = 75 EUR).';
  RAISE NOTICE '  OrdersPage.tsx teilt den Wert durch 100 → zeigt 0.75 EUR an.';
  RAISE NOTICE '  Entweder total_amount in Cents speichern (7500) oder die';
  RAISE NOTICE '  /100-Division in OrdersPage.tsx entfernen.';

END $$;
