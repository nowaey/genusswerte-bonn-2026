-- ============================================================
-- 000_reset_dev.sql
-- Genusswerte Bonn — Kompletter Reset für Entwicklung
--
-- NUR in der Entwicklung ausführen!
-- Löscht alle Views, Tabellen, Funktionen und Enum-Typen
-- in der richtigen Reihenfolge (Abhängigkeiten beachten).
--
-- Danach: 001 → 007 der Reihe nach ausführen.
-- ============================================================

-- Views
DROP VIEW IF EXISTS v_reservation_overview  CASCADE;
DROP VIEW IF EXISTS v_slot_availability     CASCADE;
DROP VIEW IF EXISTS v_voucher_overview      CASCADE;
DROP VIEW IF EXISTS v_order_overview        CASCADE;

-- Tabellen (in umgekehrter Abhängigkeitsreihenfolge)
DROP TABLE IF EXISTS voucher_reservations   CASCADE;
DROP TABLE IF EXISTS tasting_slots          CASCADE;
DROP TABLE IF EXISTS vouchers               CASCADE;
DROP TABLE IF EXISTS order_items            CASCADE;
DROP TABLE IF EXISTS orders                 CASCADE;
DROP TABLE IF EXISTS customers              CASCADE;
DROP TABLE IF EXISTS admin_users            CASCADE;

-- Funktionen
DROP FUNCTION IF EXISTS reserve_voucher_slot(text, uuid, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS generate_voucher_code(tasting_type)                            CASCADE;
DROP FUNCTION IF EXISTS is_admin()                                                      CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()                                               CASCADE;

-- Enum Types (erst nach Tabellen, wegen CASCADE oben eigentlich schon weg)
DROP TYPE IF EXISTS admin_role          CASCADE;
DROP TYPE IF EXISTS tasting_type        CASCADE;
DROP TYPE IF EXISTS slot_status         CASCADE;
DROP TYPE IF EXISTS voucher_status      CASCADE;
DROP TYPE IF EXISTS fulfillment_status  CASCADE;
DROP TYPE IF EXISTS payment_status      CASCADE;
DROP TYPE IF EXISTS order_type          CASCADE;
