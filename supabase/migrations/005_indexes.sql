-- ============================================================
-- 005_indexes.sql
-- Genusswerte Bonn — Performance Indexes
-- Ausführungsreihenfolge: 5/7
-- Voraussetzung: 002_tables.sql
-- ============================================================

-- ----------------------------------------------------------
-- admin_users
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id
  ON admin_users (user_id);

-- ----------------------------------------------------------
-- customers
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers (email);

-- ----------------------------------------------------------
-- orders
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON orders (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders (payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_order_type
  ON orders (order_type);

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session
  ON orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ----------------------------------------------------------
-- order_items
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

-- ----------------------------------------------------------
-- vouchers
-- ----------------------------------------------------------
-- Primärindex für Code-Lookup (validate-voucher, schedule-voucher)
CREATE INDEX IF NOT EXISTS idx_vouchers_code
  ON vouchers (voucher_code);

CREATE INDEX IF NOT EXISTS idx_vouchers_status
  ON vouchers (status);

CREATE INDEX IF NOT EXISTS idx_vouchers_tasting_type
  ON vouchers (tasting_type);

CREATE INDEX IF NOT EXISTS idx_vouchers_order_id
  ON vouchers (order_id);

CREATE INDEX IF NOT EXISTS idx_vouchers_customer_id
  ON vouchers (customer_id);

-- ----------------------------------------------------------
-- tasting_slots
-- ----------------------------------------------------------
-- Häufigster Query: freie Slots nach Tasting-Typ und Datum
CREATE INDEX IF NOT EXISTS idx_slots_type_date
  ON tasting_slots (tasting_type, slot_date);

CREATE INDEX IF NOT EXISTS idx_slots_status
  ON tasting_slots (status);

CREATE INDEX IF NOT EXISTS idx_slots_date
  ON tasting_slots (slot_date);

-- ----------------------------------------------------------
-- voucher_reservations
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reservations_voucher_id
  ON voucher_reservations (voucher_id);

CREATE INDEX IF NOT EXISTS idx_reservations_slot_id
  ON voucher_reservations (slot_id);
