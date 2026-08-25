-- ============================================================
-- 010_voucher_overview_with_slot.sql
-- Genusswerte Bonn — v_voucher_overview um Termin + Kontaktdaten
-- der tatsächlichen Buchung erweitern.
--
-- Grund: Der Gutscheine-Tab im Admin Panel soll auf einen Blick zeigen,
-- WANN der Termin ist und WER (Name/Telefon/Adresse) sich eingebucht
-- hat — das können vom ursprünglichen Käufer abweichende Angaben sein
-- (z. B. verschenkter Gutschein). Ersetzt den separaten
-- "Reservierungen"-Tab, der dieselbe Info doppelt zeigte.
-- ============================================================

create or replace view v_voucher_overview
with (security_invoker = true)
as
select
  v.id                        as voucher_id,
  v.voucher_code,
  v.tasting_type,
  v.persons,
  v.status                    as voucher_status,
  v.valid_until,
  v.created_at                as voucher_created_at,
  v.updated_at                as voucher_updated_at,
  o.id                        as order_id,
  o.payment_status,
  o.total_amount,
  c.id                        as customer_id,
  c.name                      as customer_name,
  c.email                     as customer_email,
  c.phone                     as customer_phone,
  r.id                        is not null as has_reservation,
  r.created_at                as reserved_at,
  r.slot_id,
  s.slot_date,
  s.slot_time,
  r.customer_name             as reservation_customer_name,
  r.customer_email            as reservation_customer_email,
  r.customer_phone            as reservation_customer_phone,
  r.customer_address          as reservation_customer_address,
  r.notes                     as reservation_notes
from vouchers v
join orders o     on o.id = v.order_id
join customers c  on c.id = v.customer_id
left join voucher_reservations r on r.voucher_id = v.id
left join tasting_slots s        on s.id = r.slot_id;

grant select on v_voucher_overview to authenticated;
