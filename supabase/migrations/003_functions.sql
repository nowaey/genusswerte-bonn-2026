-- ============================================================
-- 003_functions.sql
-- Genusswerte Bonn — Helper Functions & Business Logic
-- Ausführungsreihenfolge: 3/7
-- Voraussetzung: 001_enums.sql, 002_tables.sql
-- ============================================================


-- ============================================================
-- is_admin()
-- Prüft ob der aktuelle Supabase Auth-User in admin_users steht.
--
-- SECURITY DEFINER: Läuft als Funktions-Eigentümer (postgres),
-- umgeht dadurch RLS auf admin_users — kein Rekursionsproblem.
--
-- Wird in RLS-Policies als USING (is_admin()) verwendet.
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = auth.uid()
  );
$$;


-- ============================================================
-- generate_voucher_code(p_tasting_type)
-- Erzeugt einen eindeutigen Gutscheincode im Format:
--   GW-{PREFIX}-{YYYY}-{8 Zeichen}
--
-- Alphabet: 32 Zeichen (A-Z ohne O/I, 2-9 ohne 0/1)
-- → Keine visuell verwechselbaren Zeichen
-- → 32^8 = ~1,1 Billionen mögliche Kombinationen
-- → Kein Modulo-Bias da 256 % 32 = 0
--
-- Wird vom Stripe Webhook nach erfolgreicher Zahlung aufgerufen.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_voucher_code(
  p_tasting_type tasting_type
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix    text;
  v_year      text;
  v_alphabet  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes     bytea;
  v_random    text;
  v_code      text;
  v_attempts  int := 0;
  i           int;
BEGIN
  v_prefix := CASE p_tasting_type
    WHEN 'wein_tasting'                  THEN 'WT'
    WHEN 'afterwork_wein_tasting'        THEN 'AW'
    WHEN 'gin_tasting'                   THEN 'GIN'
    WHEN 'champagner_popcorn_tasting'    THEN 'CP'
    WHEN 'trueffel_champagner_tasting'   THEN 'TC'
    WHEN 'whisky_tasting'                THEN 'WH'
    WHEN 'craft_beer_tasting'            THEN 'CB'
    WHEN 'wagyu_wein_champagner_tasting' THEN 'WB'
    WHEN 'apero_antipasti_tasting'       THEN 'AA'
    ELSE 'GW'
  END;

  v_year := to_char(now(), 'YYYY');

  LOOP
    -- 8 kryptografisch zufällige Bytes → 8 Zeichen aus dem Alphabet
    v_bytes  := gen_random_bytes(8);
    v_random := '';
    FOR i IN 0..7 LOOP
      v_random := v_random || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    END LOOP;

    v_code := 'GW-' || v_prefix || '-' || v_year || '-' || v_random;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM vouchers WHERE voucher_code = v_code
    );

    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'generate_voucher_code: Kein eindeutiger Code nach 10 Versuchen generierbar';
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;


-- ============================================================
-- reserve_voucher_slot(...)
-- Atomar: Reservierung anlegen + Slot-Kapazität erhöhen + Voucher-Status setzen.
--
-- Schutzmechanismen:
--   - FOR UPDATE Lock auf Voucher und Slot → kein paralleles Überbuchen
--   - Alle Validierungen in einer Transaktion
--   - capacity_reserved += voucher.persons (nicht += 1)
--
-- Wird von der Edge Function schedule-voucher aufgerufen (service_role).
-- SECURITY DEFINER damit die Funktion mit ausreichenden Rechten läuft.
--
-- Rückgabe: JSONB mit { success, error?, reservation_id?, slot_date?, slot_time? }
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


-- ============================================================
-- Berechtigungen einschränken
-- SECURITY DEFINER Funktionen sind standardmäßig PUBLIC ausführbar.
-- Wir beschränken das auf das notwendige Minimum.
-- ============================================================

-- is_admin: nur authenticated (für RLS-Policies im Admin Panel)
REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT  EXECUTE ON FUNCTION is_admin() TO service_role;

-- generate_voucher_code: nur service_role (Stripe Webhook / Backend)
REVOKE EXECUTE ON FUNCTION generate_voucher_code(tasting_type) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION generate_voucher_code(tasting_type) TO service_role;

-- reserve_voucher_slot: nur service_role (Edge Function schedule-voucher)
REVOKE EXECUTE ON FUNCTION reserve_voucher_slot(text, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION reserve_voucher_slot(text, uuid, text, text, text, text, text) TO service_role;
