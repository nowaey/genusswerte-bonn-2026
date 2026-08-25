-- ============================================================
-- 002_tables.sql
-- Genusswerte Bonn — Core Tables
-- Ausführungsreihenfolge: 2/7
-- Voraussetzung: 001_enums.sql
-- ============================================================

-- ----------------------------------------------------------
-- admin_users
-- Nur hier eingetragene User dürfen das Admin Panel nutzen.
-- Kein automatisches "authenticated = Admin" — explizite Whitelist.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        admin_role  NOT NULL DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ----------------------------------------------------------
-- customers
-- Kundendaten pro Bestellung oder Reservierung.
-- email absichtlich NICHT unique: Ein Kunde kann mehrfach kaufen
-- oder für andere Personen kaufen.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  phone       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- orders
-- Jede Bestellung — egal ob Tasting-Gutschein oder Genussbox.
--
-- Wichtig:
--   payment_status wird NUR durch den Stripe Webhook auf 'paid' gesetzt.
--   Kein manuelles Setzen auf 'paid' im Frontend oder Admin Panel.
--
--   fulfillment_status ist nullable:
--     - Für Genussboxen relevant (open → shipped → completed)
--     - Für Tasting-Voucher kann es null bleiben oder auf completed
--       gesetzt werden, sobald der Voucher erzeugt wurde.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                        uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               uuid               NOT NULL REFERENCES customers(id),
  order_type                order_type         NOT NULL,
  payment_status            payment_status     NOT NULL DEFAULT 'pending',
  fulfillment_status        fulfillment_status,
  stripe_payment_intent_id  text,
  stripe_session_id         text,
  total_amount              numeric(10,2)      NOT NULL,
  currency                  char(3)            NOT NULL DEFAULT 'eur',
  metadata                  jsonb,
  created_at                timestamptz        NOT NULL DEFAULT now(),
  updated_at                timestamptz        NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- order_items
-- Positionen innerhalb einer Bestellung.
-- tasting_type nur bei order_type = 'tasting_voucher' gesetzt.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name  text         NOT NULL,
  tasting_type  tasting_type,
  quantity      int          NOT NULL DEFAULT 1,
  unit_price    numeric(10,2) NOT NULL,
  CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- ----------------------------------------------------------
-- vouchers
-- Ein Tasting-Gutschein pro bezahlter Order.
--
-- Wichtig:
--   Voucher werden NICHT automatisch per Trigger erzeugt.
--   Erzeugung erfolgt gezielt im Stripe Webhook (service_role).
--   Dadurch bleibt die Logik transparent und nachvollziehbar.
--
--   voucher_code im Format: GW-{PREFIX}-{YYYY}-{8 Zeichen}
--   Beispiel: GW-GIN-2026-A8K3P9HX
--   Erzeugung über generate_voucher_code() in 003_functions.sql
--
--   persons: Anzahl Personen des Gutscheins.
--   Beim Reservieren wird capacity_reserved += persons (nicht += 1).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vouchers (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_code  text           UNIQUE NOT NULL,
  order_id      uuid           NOT NULL REFERENCES orders(id),
  customer_id   uuid           NOT NULL REFERENCES customers(id),
  tasting_type  tasting_type   NOT NULL,
  persons       int            NOT NULL DEFAULT 2,
  status        voucher_status NOT NULL DEFAULT 'active',
  valid_until   date,
  created_at    timestamptz    NOT NULL DEFAULT now(),
  updated_at    timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT persons_positive CHECK (persons > 0)
);

-- ----------------------------------------------------------
-- tasting_slots
-- Verfügbare Tasting-Termine.
-- Werden ausschließlich durch Admins angelegt und verwaltet.
--
-- capacity_reserved wird durch reserve_voucher_slot() erhöht,
-- niemals manuell oder direkt durch die Website.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasting_slots (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_type       tasting_type NOT NULL,
  slot_date          date        NOT NULL,
  slot_time          time        NOT NULL,
  capacity_total     int         NOT NULL,
  capacity_reserved  int         NOT NULL DEFAULT 0,
  status             slot_status NOT NULL DEFAULT 'active',
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capacity_not_exceeded   CHECK (capacity_reserved <= capacity_total),
  CONSTRAINT capacity_total_positive CHECK (capacity_total > 0),
  CONSTRAINT capacity_reserved_nneg  CHECK (capacity_reserved >= 0)
);

-- ----------------------------------------------------------
-- voucher_reservations
-- Terminbuchung für einen Gutschein.
--
-- Wichtig:
--   Ein Gutschein kann MAXIMAL EINE Reservierung haben (UNIQUE voucher_id).
--   Der Gutschein gilt erst als "eingelöst" (checked_in), wenn der Kunde
--   tatsächlich im Laden erscheint — nicht bei der Terminwahl.
--
--   customer_* Felder sind die Angaben des Kunden beim Einlösen.
--   Diese können von den customers-Daten der ursprünglichen Bestellung abweichen
--   (z. B. wenn jemand einen Gutschein verschenkt).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS voucher_reservations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id        uuid        UNIQUE NOT NULL REFERENCES vouchers(id),
  slot_id           uuid        NOT NULL REFERENCES tasting_slots(id),
  customer_name     text        NOT NULL,
  customer_email    text        NOT NULL,
  customer_phone    text,
  customer_address  text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
