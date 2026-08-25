-- ============================================================
-- 011_reservation_overview_voucher_id.sql
-- Genusswerte Bonn — v_reservation_overview um voucher_id erweitern
--
-- Grund: Der Tastings-Tab im Admin Panel soll bei jedem Termin die
-- gebuchten Gäste anzeigen und direkt einchecken können. Dafür wird
-- die voucher_id gebraucht (nicht nur der voucher_code), um den
-- Check-in per UPDATE auf vouchers.id zu setzen.
-- ============================================================

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
  v.id                as voucher_id,
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

grant select on v_reservation_overview to authenticated;
