-- =========================================================
-- Genusswerte Bonn — Voucher Migration
-- Im Supabase SQL Editor ausführen (nach tastings_setup.sql)
-- =========================================================

-- ---------------------------------------------------------
-- 1. tasting_slug zu vouchers hinzufügen (falls fehlt)
-- ---------------------------------------------------------
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS tasting_slug TEXT;

-- Wenn vouchers bereits Datensätze hat, kannst du die Zuordnung
-- hier manuell nachtragen, z.B.:
-- UPDATE vouchers SET tasting_slug = 'wein' WHERE code LIKE 'GW-WEIN-%';
-- UPDATE vouchers SET tasting_slug = 'gin'  WHERE code LIKE 'GW-GIN-%';


-- ---------------------------------------------------------
-- 2. book_slot() — atomare Kapazitätsprüfung + Buchung
--    Verhindert Überbuchung bei gleichzeitigen Anfragen
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION book_slot(p_slot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot tasting_slots%ROWTYPE;
BEGIN
  -- Row-Lock: verhindert Race Condition bei gleichzeitigen Buchungen
  SELECT * INTO v_slot
  FROM tasting_slots
  WHERE id = p_slot_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_NOT_FOUND');
  END IF;

  IF v_slot.booked_count >= v_slot.max_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_NO_CAPACITY');
  END IF;

  UPDATE tasting_slots
  SET booked_count = booked_count + 1,
      updated_at   = NOW()
  WHERE id = p_slot_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RLS: book_slot darf von authenticated (Edge Function mit service_role) aufgerufen werden
GRANT EXECUTE ON FUNCTION book_slot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION book_slot(UUID) TO service_role;


-- ---------------------------------------------------------
-- 3. RLS für redemption_requests (anpassen falls Tabelle
--    andere Spaltennamen hat)
-- ---------------------------------------------------------
ALTER TABLE redemption_requests ENABLE ROW LEVEL SECURITY;

-- Admins können alles lesen/schreiben
CREATE POLICY IF NOT EXISTS "redemption_admin_all"
  ON redemption_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service Role darf immer schreiben (für Edge Functions)
CREATE POLICY IF NOT EXISTS "redemption_service_insert"
  ON redemption_requests FOR INSERT TO service_role WITH CHECK (true);


-- ---------------------------------------------------------
-- ÜBERPRÜFUNG
-- ---------------------------------------------------------
-- SELECT book_slot('<eine-gültige-slot-uuid>'::uuid);
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'vouchers';
