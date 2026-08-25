-- ============================================================
-- 009_dedupe_tasting_slots.sql
-- Genusswerte Bonn — Duplikate entfernen + für immer verhindern
--
-- Ursache: Die automatische Termin-Erstellung im Admin Panel lief beim
-- Laden der Seite (React StrictMode) kurz hintereinander zweimal, bevor
-- der erste Durchlauf fertig war — dadurch wurde jeder Termin doppelt
-- angelegt. Diese Datei räumt die Duplikate auf und sorgt per
-- Unique-Constraint dafür, dass es nie wieder passieren kann, egal was
-- im Frontend-Code passiert.
-- ============================================================

-- Pro (tasting_type, slot_date, slot_time) nur die älteste Zeile behalten,
-- alle weiteren Kopien löschen.
delete from tasting_slots
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by tasting_type, slot_date, slot_time
        order by created_at, id
      ) as rn
    from tasting_slots
    where tasting_type is not null
  ) ranked
  where ranked.rn > 1
);

-- Ab jetzt technisch unmöglich, denselben Termin zweimal anzulegen.
alter table tasting_slots
  add constraint tasting_slots_unique_slot unique (tasting_type, slot_date, slot_time);
