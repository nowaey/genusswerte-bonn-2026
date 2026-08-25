-- ============================================================
-- 008_fix_tasting_slots.sql
-- Genusswerte Bonn — Korrektur: tasting_slots nachträglich ergänzen
--
-- Hintergrund: tasting_slots existierte bereits aus einem früheren
-- eigenen Versuch (Spalten: tasting_id, max_capacity, booked_count,
-- is_active). Weil 002_tables.sql mit "CREATE TABLE IF NOT EXISTS"
-- arbeitet, wurde die Tabelle beim ersten Migrations-Lauf NICHT neu
-- angelegt — die alten Spalten blieben, die neuen fehlten. Dadurch
-- scheiterten auch v_slot_availability und v_reservation_overview aus
-- 006_views.sql (sie referenzieren die fehlenden Spalten).
--
-- Diese Datei ergänzt NUR die fehlenden neuen Spalten (alte Spalten
-- bleiben unangetastet, falls das alte System/View available_tasting_slots
-- noch irgendwo gebraucht wird) und legt die beiden Views nachträglich an.
-- ============================================================

alter table tasting_slots
  add column if not exists tasting_type      tasting_type,
  add column if not exists capacity_total    integer,
  add column if not exists capacity_reserved integer not null default 0,
  add column if not exists status            slot_status not null default 'active';

-- Alte Pflichtfelder aus dem ersten Versuch (tasting_id, max_capacity,
-- booked_count, is_active) werden von unserem neuen Code nicht mehr
-- befüllt. Damit INSERTs nicht daran scheitern, NOT-NULL entfernen —
-- die Spalten bleiben aber erhalten (falls das alte System sie noch
-- irgendwo braucht).
alter table tasting_slots alter column tasting_id    drop not null;
alter table tasting_slots alter column max_capacity  drop not null;
alter table tasting_slots alter column booked_count  drop not null;
alter table tasting_slots alter column is_active     drop not null;

do $$ begin
  alter table tasting_slots
    add constraint capacity_reserved_nneg_new check (capacity_reserved >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table tasting_slots
    add constraint capacity_not_exceeded_new check (capacity_total is null or capacity_reserved <= capacity_total);
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------
-- v_slot_availability (jetzt nachträglich anlegbar)
-- ----------------------------------------------------------
create or replace view v_slot_availability
with (security_invoker = true)
as
select
  id,
  tasting_type,
  slot_date,
  slot_time,
  capacity_total,
  capacity_reserved,
  capacity_total - capacity_reserved as available_seats,
  status,
  notes
from tasting_slots
where status = 'active'
  and capacity_reserved < capacity_total
  and slot_date >= current_date
order by slot_date, slot_time;

-- ----------------------------------------------------------
-- v_reservation_overview (jetzt nachträglich anlegbar)
-- ----------------------------------------------------------
create or replace view v_reservation_overview
with (security_invoker = true)
as
select
  r.id                as reservation_id,
  r.created_at        as reserved_at,
  r.customer_name,
  r.customer_email,
  r.customer_phone,
  r.customer_address,
  r.notes             as customer_notes,
  v.voucher_code,
  v.tasting_type,
  v.persons,
  v.status            as voucher_status,
  s.id                as slot_id,
  s.slot_date,
  s.slot_time,
  s.capacity_total,
  s.capacity_reserved,
  s.notes             as slot_notes
from voucher_reservations r
join vouchers v      on v.id = r.voucher_id
join tasting_slots s on s.id = r.slot_id
order by s.slot_date, s.slot_time;

grant select on v_slot_availability    to authenticated;
grant select on v_reservation_overview to authenticated;
