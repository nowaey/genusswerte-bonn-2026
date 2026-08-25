-- ============================================================
-- 012_slot_lead_time.sql
-- Genusswerte Bonn — Mindestvorlaufzeit fürs Buchen
--
-- Ein Termin darf frühestens übermorgen gebucht werden (heute und
-- morgen sind gesperrt). Wird bereits in get-available-slots gefiltert
-- (Kunde sieht so einen Termin gar nicht erst), zusätzlich hier in
-- reserve_voucher_slot() als serverseitige Absicherung — falls die
-- Prüfung im Frontend/Edge Function mal umgangen wird.
-- ============================================================

CREATE OR REPLACE FUNCTION reserve_voucher_slot(
  p_voucher_code     text,
  p_slot_id          uuid,
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text    DEFAULT NULL,
  p_customer_address text    DEFAULT NULL,
  p_notes            text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher  vouchers%ROWTYPE;
  v_slot     tasting_slots%ROWTYPE;
  v_res_id   uuid;
BEGIN
  -- --------------------------------------------------------
  -- 1. Voucher laden und sperren (FOR UPDATE)
  -- --------------------------------------------------------
  SELECT * INTO v_voucher
  FROM vouchers
  WHERE voucher_code = p_voucher_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VOUCHER_NOT_FOUND');
  END IF;

  -- Nur aktive Gutscheine können reserviert werden
  IF v_voucher.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'VOUCHER_NOT_ACTIVE',
      'status',  v_voucher.status::text
    );
  END IF;

  -- Ablauf prüfen
  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < CURRENT_DATE THEN
    UPDATE vouchers SET status = 'expired', updated_at = now() WHERE id = v_voucher.id;
    RETURN jsonb_build_object('success', false, 'error', 'VOUCHER_EXPIRED');
  END IF;

  -- Doppelte Reservierung verhindern
  IF EXISTS (SELECT 1 FROM voucher_reservations WHERE voucher_id = v_voucher.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'VOUCHER_ALREADY_RESERVED');
  END IF;

  -- --------------------------------------------------------
  -- 2. Slot laden und sperren (FOR UPDATE)
  -- --------------------------------------------------------
  SELECT * INTO v_slot
  FROM tasting_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_NOT_FOUND');
  END IF;

  -- Mindestvorlauf: frühestens übermorgen
  IF v_slot.slot_date < CURRENT_DATE + 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_TOO_SOON');
  END IF;

  -- Tasting-Typ muss übereinstimmen
  IF v_slot.tasting_type != v_voucher.tasting_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_TYPE_MISMATCH');
  END IF;

  -- Slot muss aktiv sein
  IF v_slot.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_NOT_ACTIVE');
  END IF;

  -- Kapazität prüfen (Personenanzahl des Gutscheins, nicht einfach +1)
  IF v_slot.capacity_reserved + v_voucher.persons > v_slot.capacity_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_NO_CAPACITY');
  END IF;

  -- --------------------------------------------------------
  -- 3. Reservierung anlegen
  -- --------------------------------------------------------
  INSERT INTO voucher_reservations (
    voucher_id,    slot_id,
    customer_name, customer_email, customer_phone,
    customer_address, notes
  ) VALUES (
    v_voucher.id,  v_slot.id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_customer_address, p_notes
  )
  RETURNING id INTO v_res_id;

  -- --------------------------------------------------------
  -- 4. Slot-Kapazität erhöhen (um Personenanzahl des Gutscheins)
  --    Wenn dadurch ausgebucht: Status auf 'full' setzen.
  -- --------------------------------------------------------
  UPDATE tasting_slots
  SET
    capacity_reserved = capacity_reserved + v_voucher.persons,
    status = CASE
      WHEN capacity_reserved + v_voucher.persons >= capacity_total
        THEN 'full'::slot_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_slot.id;

  -- --------------------------------------------------------
  -- 5. Voucher-Status auf 'scheduled' setzen
  -- --------------------------------------------------------
  UPDATE vouchers
  SET status     = 'scheduled',
      updated_at = now()
  WHERE id = v_voucher.id;

  -- --------------------------------------------------------
  -- 6. Erfolg zurückgeben
  -- --------------------------------------------------------
  RETURN jsonb_build_object(
    'success',        true,
    'reservation_id', v_res_id::text,
    'voucher_code',   p_voucher_code,
    'slot_date',      v_slot.slot_date::text,
    'slot_time',      v_slot.slot_time::text
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   'INTERNAL_ERROR',
    'detail',  SQLERRM
  );
END;
$$;
