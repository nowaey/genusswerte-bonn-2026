-- ============================================================
-- 001_enums.sql
-- Genusswerte Bonn — Enum Types
-- Ausführungsreihenfolge: 1/7
-- ============================================================

-- Art der Bestellung
DO $$ BEGIN
  CREATE TYPE order_type AS ENUM (
    'tasting_voucher',
    'gift_box'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Zahlungsstatus — wird ausschließlich durch Stripe Webhook gesetzt
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Lieferstatus — relevant für Genussboxen
DO $$ BEGIN
  CREATE TYPE fulfillment_status AS ENUM (
    'open',
    'in_progress',
    'ready_for_pickup',
    'shipped',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Gutschein-Lebenszyklus
DO $$ BEGIN
  CREATE TYPE voucher_status AS ENUM (
    'active',
    'scheduled',
    'checked_in',
    'cancelled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status eines Tasting-Termins
DO $$ BEGIN
  CREATE TYPE slot_status AS ENUM (
    'active',
    'full',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alle angebotenen Tasting-Typen
DO $$ BEGIN
  CREATE TYPE tasting_type AS ENUM (
    'wein_tasting',
    'afterwork_wein_tasting',
    'gin_tasting',
    'champagner_popcorn_tasting',
    'trueffel_champagner_tasting',
    'whisky_tasting',
    'craft_beer_tasting',
    'wagyu_wein_champagner_tasting',
    'apero_antipasti_tasting'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rollen im Admin Panel
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM (
    'admin',
    'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
