-- ============================================================
-- 004_triggers.sql
-- Genusswerte Bonn — Triggers
-- Ausführungsreihenfolge: 4/7
-- Voraussetzung: 002_tables.sql
--
-- Bewusst kein automatischer Voucher-Erzeugungsroutine:
-- Voucher werden gezielt im Stripe Webhook erzeugt, nicht per Trigger.
-- Das macht die Logik transparent, nachvollziehbar und leichter testbar.
-- ============================================================

-- ============================================================
-- set_updated_at()
-- Setzt das updated_at-Feld beim UPDATE automatisch auf now().
-- Wird von allen Tabellen mit updated_at verwendet.
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- orders
CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- vouchers
CREATE OR REPLACE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- tasting_slots
CREATE OR REPLACE TRIGGER trg_tasting_slots_updated_at
  BEFORE UPDATE ON tasting_slots
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
