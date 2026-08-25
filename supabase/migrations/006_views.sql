-- ============================================================
-- 006_views.sql
-- Genusswerte Bonn — Admin Views
-- Ausführungsreihenfolge: 6/7
-- Voraussetzung: 001–005
--
-- security_invoker = true: RLS der Basistabellen gilt für den
-- aufrufenden User, nicht für den View-Eigentümer.
-- → anon-User sehen nichts (keine RLS-Policy für anon)
-- → Admin-User sehen alles (is_admin() = true)
-- ============================================================

-- ----------------------------------------------------------
-- v_order_overview
-- Bestellübersicht mit Kundendaten für das Admin Panel.
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v_order_overview
WITH (security_invoker = true)
AS
SELECT
  o.id                        AS order_id,
  o.order_type,
  o.payment_status,
  o.fulfillment_status,
  o.total_amount,
  o.currency,
  o.stripe_session_id,
  o.created_at                AS ordered_at,
  o.updated_at,
  c.id                        AS customer_id,
  c.name                      AS customer_name,
  c.email                     AS customer_email,
  c.phone                     AS customer_phone,
  (
    SELECT count(*)::int
    FROM order_items oi
    WHERE oi.order_id = o.id
  )                           AS item_count
FROM orders o
JOIN customers c ON c.id = o.customer_id;

-- ----------------------------------------------------------
-- v_voucher_overview
-- Gutscheinübersicht mit Order- und Kundendaten.
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v_voucher_overview
WITH (security_invoker = true)
AS
SELECT
  v.id                        AS voucher_id,
  v.voucher_code,
  v.tasting_type,
  v.persons,
  v.status                    AS voucher_status,
  v.valid_until,
  v.created_at                AS voucher_created_at,
  v.updated_at                AS voucher_updated_at,
  o.id                        AS order_id,
  o.payment_status,
  o.total_amount,
  c.id                        AS customer_id,
  c.name                      AS customer_name,
  c.email                     AS customer_email,
  c.phone                     AS customer_phone,
  r.id                        IS NOT NULL AS has_reservation,
  r.created_at                AS reserved_at,
  r.slot_id
FROM vouchers v
JOIN orders o     ON o.id = v.order_id
JOIN customers c  ON c.id = v.customer_id
LEFT JOIN voucher_reservations r ON r.voucher_id = v.id;

-- ----------------------------------------------------------
-- v_slot_availability
-- Freie Tasting-Termine (zukünftig, aktiv, nicht voll).
-- Wird von Edge Functions und Admin Panel genutzt.
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v_slot_availability
WITH (security_invoker = true)
AS
SELECT
  id,
  tasting_type,
  slot_date,
  slot_time,
  capacity_total,
  capacity_reserved,
  capacity_total - capacity_reserved  AS available_seats,
  status,
  notes
FROM tasting_slots
WHERE status = 'active'
  AND capacity_reserved < capacity_total
  AND slot_date >= CURRENT_DATE
ORDER BY slot_date, slot_time;

-- ----------------------------------------------------------
-- v_reservation_overview
-- Alle Reservierungen mit Slot- und Gutschein-Details.
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW v_reservation_overview
WITH (security_invoker = true)
AS
SELECT
  r.id                AS reservation_id,
  r.created_at        AS reserved_at,
  r.customer_name,
  r.customer_email,
  r.customer_phone,
  r.customer_address,
  r.notes             AS customer_notes,
  v.voucher_code,
  v.tasting_type,
  v.persons,
  v.status            AS voucher_status,
  s.id                AS slot_id,
  s.slot_date,
  s.slot_time,
  s.capacity_total,
  s.capacity_reserved,
  s.notes             AS slot_notes
FROM voucher_reservations r
JOIN vouchers v      ON v.id = r.voucher_id
JOIN tasting_slots s ON s.id = r.slot_id
ORDER BY s.slot_date, s.slot_time;

-- ----------------------------------------------------------
-- Views für authenticated Role freigeben
-- (RLS der Basistabellen schränkt dann weiter ein auf is_admin())
-- ----------------------------------------------------------
GRANT SELECT ON v_order_overview       TO authenticated;
GRANT SELECT ON v_voucher_overview     TO authenticated;
GRANT SELECT ON v_slot_availability    TO authenticated;
GRANT SELECT ON v_reservation_overview TO authenticated;

-- service_role (Edge Functions) hat ohnehin vollen Zugriff (BYPASSRLS).
-- anon erhält keinen direkten View-Zugriff. Website läuft über Edge Functions.
