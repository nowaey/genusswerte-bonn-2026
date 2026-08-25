-- =========================================================
-- Genusswerte Bonn — Tastings & Slots Setup
-- Ausführen im Supabase Dashboard → SQL Editor → New Query
-- Kann beliebig oft ausgeführt werden (idempotent)
-- =========================================================

-- ---------------------------------------------------------
-- 0. CLEANUP — alte Objekte entfernen (falls vorhanden)
-- ---------------------------------------------------------
DROP VIEW  IF EXISTS available_tasting_slots;
DROP TABLE IF EXISTS tasting_slots CASCADE;
DROP TABLE IF EXISTS tastings      CASCADE;


-- ---------------------------------------------------------
-- 1. TASTINGS — Tasting-Formate
-- ---------------------------------------------------------
CREATE TABLE tastings (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  slug             TEXT         UNIQUE NOT NULL,   -- entspricht id in window.GW_TASTINGS
  title            TEXT         NOT NULL,
  category         TEXT         NOT NULL,
  description      TEXT,
  price_per_person NUMERIC(10,2) NOT NULL,
  duration         TEXT         NOT NULL,
  location         TEXT         NOT NULL DEFAULT 'Genusswerte Bonn',
  max_persons      INTEGER      NOT NULL DEFAULT 6,
  image_path       TEXT,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);


-- ---------------------------------------------------------
-- 2. TASTING SLOTS — Einzelne buchbare Termine
-- ---------------------------------------------------------
CREATE TABLE tasting_slots (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tasting_id    UUID        REFERENCES tastings(id) ON DELETE CASCADE NOT NULL,
  slot_date     DATE        NOT NULL,
  slot_time     TIME        NOT NULL,
  max_capacity  INTEGER     NOT NULL DEFAULT 10,
  booked_count  INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  notes         TEXT,                               -- interne Admin-Notiz zum Termin
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tasting_id, slot_date, slot_time)
);


-- ---------------------------------------------------------
-- 3. VIEW — Nur verfügbare Termine (öffentlich nutzbar)
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW available_tasting_slots AS
  SELECT
    s.id,
    s.tasting_id,
    t.slug              AS tasting_slug,
    t.title             AS tasting_title,
    t.category,
    t.price_per_person,
    t.duration,
    s.slot_date,
    s.slot_time,
    s.max_capacity,
    s.booked_count,
    (s.max_capacity - s.booked_count) AS remaining_capacity,
    s.notes
  FROM tasting_slots s
  JOIN tastings t ON t.id = s.tasting_id
  WHERE s.is_active    = true
    AND t.is_active    = true
    AND s.booked_count < s.max_capacity
    AND s.slot_date   >= CURRENT_DATE
  ORDER BY s.slot_date, s.slot_time;


-- ---------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------
ALTER TABLE tastings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_slots ENABLE ROW LEVEL SECURITY;

-- Öffentlich lesbar (anonyme Website-Besucher)
CREATE POLICY "tastings_public_read"
  ON tastings FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "tasting_slots_public_read"
  ON tasting_slots FOR SELECT TO anon USING (is_active = true);

-- Schreiben nur für eingeloggte Admins
CREATE POLICY "tastings_admin_all"
  ON tastings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "tasting_slots_admin_all"
  ON tasting_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------
-- 5. UPDATED_AT TRIGGER
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tastings_updated_at
  BEFORE UPDATE ON tastings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER tasting_slots_updated_at
  BEFORE UPDATE ON tasting_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =========================================================
-- 6. TASTING-FORMATE EINFÜGEN (9 Formate)
-- Slugs entsprechen den IDs in tastings-data.js
-- =========================================================
INSERT INTO tastings (slug, title, category, description, price_per_person, duration, image_path)
VALUES
  (
    'wein',
    'Wein Tasting',
    'Tasting-Format',
    'Eine Reise durch fünf einzigartige Weine, fein abgestimmt auf ausgesuchte Käsespezialitäten. Auch als Naturwein, vegan oder alkoholfrei erhältlich.',
    29.00, 'ca. 2 Stunden', 'assets/images/tasting-wein.jpg'
  ),
  (
    'afterwork',
    'Afterwork Wein Tasting',
    'Tasting-Format',
    'Vier ausgewählte Weine und feine Häppchen aus der Feinkost machen deinen Feierabend zum Genuss. Entspannt, stilvoll, unvergesslich.',
    19.00, 'ca. 1,5 Stunden', 'assets/images/tasting-afterwork.jpg'
  ),
  (
    'gin',
    'Gin Tasting',
    'Tasting-Format',
    'Vier besondere Gins, begleitet von passenden Tonic Waters. Kein Fachgesimpel — einfach gutes Trinken, spannende Aromen und ein toller Abend.',
    45.00, 'ca. 2 Stunden', 'assets/images/tasting-gin.jpg'
  ),
  (
    'champagner',
    'Champagner & Popcorn',
    'Tasting-Format',
    'Fünf Champagner und Schaumweine treffen auf kreative Popcorn-Sorten. Eine Kombination, die überrascht und garantiert ein Lächeln zaubert.',
    39.00, 'ca. 2 Stunden', 'assets/images/tasting-champagner.jpg'
  ),
  (
    'trueffel',
    'Trüffel & Champagner',
    'Tasting-Format · Premium',
    'Ein Aperitif zur Begrüßung, drei liebevoll komponierte Gänge — veredelt mit frischem Trüffel und abgestimmt auf edle Schaumweine. Kulinarische Eleganz pur.',
    66.00, 'ca. 3 Stunden', 'assets/images/tasting-trueffel.png'
  ),
  (
    'whisky',
    'Whisky Tasting',
    'Tasting-Format',
    'Fünf ausgewählte Whiskys, serviert mit gerösteten Salzmandeln und edler Schokolade — ein stilvoller Abend für alle, die guten Geschmack feiern.',
    45.00, 'ca. 2,5 Stunden', 'assets/images/tasting-whisky.png'
  ),
  (
    'craftbeer',
    'Craft Beer Tasting',
    'Tasting-Format',
    'Einzigartige, handgebraute Biere aus der Region und aller Welt — von hopfig-fruchtig bis malzig-dunkel. Finde dein Lieblingsbier in guter Gesellschaft.',
    25.00, 'ca. 2 Stunden', 'assets/images/tasting-craftbeer.jpg'
  ),
  (
    'wagyu',
    'Wagyu, Wein & Champagner',
    'Tasting-Format · Highlight',
    'Das beste Fleisch der Welt trifft auf drei erstklassige Weine und einen erfrischenden Champagner — eine Geschmacksexplosion, die nachhaltig beeindruckt.',
    55.00, 'ca. 2,5 Stunden', 'assets/images/tasting-wagyu.jpg'
  ),
  (
    'apero',
    'Apéro & Antipasti',
    'Tasting-Format',
    'Leckere Antipasti und perfekt abgestimmte Aperitif-Drinks — für jeden Geschmack etwas dabei. Auch in einer alkoholfreien Variante erhältlich.',
    29.00, 'ca. 1,5 Stunden', 'assets/images/tasting-apero.jpg'
  )
ON CONFLICT (slug) DO NOTHING;


-- =========================================================
-- 7. TASTING SLOTS EINFÜGEN — 10 Termine pro Format
--    Berechnungsgrundlage: 2026-06-04 (Mittwoch)
--    Whisky Tasting: kein Termin vom Betreiber angegeben
-- =========================================================

-- ---------------------------------------------------------
-- WEIN TASTING — Do 19:00 / Fr 20:00 / Sa 20:00
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-05', '19:00'),   -- Donnerstag
  ('2026-06-06', '20:00'),   -- Freitag
  ('2026-06-07', '20:00'),   -- Samstag
  ('2026-06-12', '19:00'),
  ('2026-06-13', '20:00'),
  ('2026-06-14', '20:00'),
  ('2026-06-19', '19:00'),
  ('2026-06-20', '20:00'),
  ('2026-06-21', '20:00'),
  ('2026-06-26', '19:00')
) AS v(d, s)
WHERE t.slug = 'wein'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- AFTERWORK WEIN TASTING — Mi 18:00
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-11', '18:00'),
  ('2026-06-18', '18:00'),
  ('2026-06-25', '18:00'),
  ('2026-07-02', '18:00'),
  ('2026-07-09', '18:00'),
  ('2026-07-16', '18:00'),
  ('2026-07-23', '18:00'),
  ('2026-07-30', '18:00'),
  ('2026-08-06', '18:00'),
  ('2026-08-13', '18:00')
) AS v(d, s)
WHERE t.slug = 'afterwork'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- CHAMPAGNER & POPCORN — jeden Sa 12:00
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-07', '12:00'),
  ('2026-06-14', '12:00'),
  ('2026-06-21', '12:00'),
  ('2026-06-28', '12:00'),
  ('2026-07-05', '12:00'),
  ('2026-07-12', '12:00'),
  ('2026-07-19', '12:00'),
  ('2026-07-26', '12:00'),
  ('2026-08-02', '12:00'),
  ('2026-08-09', '12:00')
) AS v(d, s)
WHERE t.slug = 'champagner'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- APÉRO & ANTIPASTI — Fr 17:00 / Sa 16:00
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-06', '17:00'),   -- Freitag
  ('2026-06-07', '16:00'),   -- Samstag
  ('2026-06-13', '17:00'),
  ('2026-06-14', '16:00'),
  ('2026-06-20', '17:00'),
  ('2026-06-21', '16:00'),
  ('2026-06-27', '17:00'),
  ('2026-06-28', '16:00'),
  ('2026-07-04', '17:00'),
  ('2026-07-05', '16:00')
) AS v(d, s)
WHERE t.slug = 'apero'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- CRAFT BEER TASTING — jeweils 1. Samstag im Monat, 20:00
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-07', '20:00'),   -- 1. Sa Jun
  ('2026-07-05', '20:00'),   -- 1. Sa Jul
  ('2026-08-02', '20:00'),   -- 1. Sa Aug
  ('2026-09-06', '20:00'),   -- 1. Sa Sep
  ('2026-10-04', '20:00'),   -- 1. Sa Okt
  ('2026-11-01', '20:00'),   -- 1. Sa Nov
  ('2026-12-06', '20:00'),   -- 1. Sa Dez
  ('2027-01-03', '20:00'),   -- 1. Sa Jan
  ('2027-02-07', '20:00'),   -- 1. Sa Feb
  ('2027-03-07', '20:00')    -- 1. Sa Mär
) AS v(d, s)
WHERE t.slug = 'craftbeer'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- WAGYU, WEIN & CHAMPAGNER — jeweils 2. Samstag im Monat, 20:00
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-14', '20:00'),   -- 2. Sa Jun
  ('2026-07-12', '20:00'),
  ('2026-08-09', '20:00'),
  ('2026-09-13', '20:00'),
  ('2026-10-11', '20:00'),
  ('2026-11-08', '20:00'),
  ('2026-12-13', '20:00'),
  ('2027-01-10', '20:00'),
  ('2027-02-14', '20:00'),
  ('2027-03-14', '20:00')
) AS v(d, s)
WHERE t.slug = 'wagyu'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- GIN TASTING — jeweils 3. Samstag im Monat, 20:00
-- HINWEIS: Gleicher Termin wie Trüffel & Champagner —
--           Admin muss einen der beiden Slots deaktivieren.
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-21', '20:00'),   -- 3. Sa Jun
  ('2026-07-19', '20:00'),
  ('2026-08-16', '20:00'),
  ('2026-09-20', '20:00'),
  ('2026-10-18', '20:00'),
  ('2026-11-15', '20:00'),
  ('2026-12-20', '20:00'),
  ('2027-01-17', '20:00'),
  ('2027-02-21', '20:00'),
  ('2027-03-21', '20:00')
) AS v(d, s)
WHERE t.slug = 'gin'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- ---------------------------------------------------------
-- TRÜFFEL & CHAMPAGNER — jeweils 3. Samstag im Monat, 20:00
-- HINWEIS: Gleicher Termin wie Gin Tasting —
--           Admin muss einen der beiden Slots deaktivieren.
-- ---------------------------------------------------------
INSERT INTO tasting_slots (tasting_id, slot_date, slot_time)
SELECT t.id, v.d::date, v.s::time
FROM tastings t
CROSS JOIN (VALUES
  ('2026-06-21', '20:00'),
  ('2026-07-19', '20:00'),
  ('2026-08-16', '20:00'),
  ('2026-09-20', '20:00'),
  ('2026-10-18', '20:00'),
  ('2026-11-15', '20:00'),
  ('2026-12-20', '20:00'),
  ('2027-01-17', '20:00'),
  ('2027-02-21', '20:00'),
  ('2027-03-21', '20:00')
) AS v(d, s)
WHERE t.slug = 'trueffel'
ON CONFLICT (tasting_id, slot_date, slot_time) DO NOTHING;


-- =========================================================
-- ÜBERPRÜFUNG — Diese Queries nach dem Ausführen testen
-- =========================================================

-- Alle Tasting-Formate:
-- SELECT slug, title, price_per_person, is_active FROM tastings ORDER BY slug;

-- Alle Slots (gesamt):
-- SELECT tasting_slug, slot_date, slot_time, max_capacity, booked_count
-- FROM available_tasting_slots ORDER BY slot_date, slot_time;

-- Slots zählen pro Tasting:
-- SELECT t.slug, COUNT(s.id) AS slot_count
-- FROM tastings t LEFT JOIN tasting_slots s ON s.tasting_id = t.id
-- GROUP BY t.slug ORDER BY t.slug;
