-- =========================================================
-- 013_rate_limiting.sql — Genusswerte Bonn
--
-- Einfacher, DB-gestuetzter Rate-Limiter fuer oeffentliche Edge
-- Functions ohne eigene Authentifizierung (z.B. submit-group-inquiry).
--
-- Warum in der DB statt im Edge-Function-Code selbst gezaehlt?
-- Edge-Function-Instanzen sind zustandslos/kurzlebig und koennen
-- mehrfach parallel laufen — ein Zaehler im Code (z.B. eine
-- Variable im Modul) wuerde pro Instanz neu bei 0 anfangen und
-- liesse sich trivial umgehen. In der Datenbank ist der Zaehler
-- fuer alle Instanzen gemeinsam sichtbar und atomar aktualisierbar.
-- =========================================================

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  bucket_key   text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count    integer NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

-- Alte Fenster brauchen keinen Index-Ueberbau, aber eine schnelle
-- Aufraeum-Abfrage schadet nicht:
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_window_start
  ON rate_limit_hits (window_start);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Nur service_role (Edge Functions) darf hier lesen/schreiben —
-- kein anon-/authenticated-Zugriff, genau wie bei allen anderen
-- Tabellen in diesem Projekt.

COMMENT ON TABLE rate_limit_hits IS
  'Zaehlt Aufrufe pro Zeitfenster fuer check_rate_limit(). Nur service_role.';

-- ---------------------------------------------------------
-- check_rate_limit(bucket_key, max_hits, window_seconds)
--
-- Atomar: erhoeht den Zaehler fuer das aktuelle Zeitfenster und
-- gibt zurueck, ob die Anfrage noch erlaubt ist. Fenster werden
-- auf volle window_seconds-Intervalle seit Epoch gerundet (feste
-- Fenster, kein Sliding Window — einfach und ausreichend hier).
--
-- Beispiel: check_rate_limit('group-inquiry:203.0.113.5', 5, 3600)
--   -> true fuer die ersten 5 Aufrufe dieser IP pro Stunde, danach false.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_bucket_key text,
  p_max_hits integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO rate_limit_hits (bucket_key, window_start, hit_count)
  VALUES (p_bucket_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET hit_count = rate_limit_hits.hit_count + 1
  RETURNING hit_count INTO v_count;

  RETURN v_count <= p_max_hits;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) TO service_role;

COMMENT ON FUNCTION check_rate_limit IS
  'Atomarer Zaehler pro Zeitfenster. true = Anfrage erlaubt, false = Limit erreicht.';

-- ---------------------------------------------------------
-- Aufraeumen alter Fenster — haelt die Tabelle klein. Kann manuell
-- oder per pg_cron periodisch aufgerufen werden; kein Zwang, da die
-- Tabelle bei diesem Traffic-Volumen ohnehin klein bleibt.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_rate_limit_hits() RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limit_hits WHERE window_start < now() - interval '1 day';
$$;

GRANT EXECUTE ON FUNCTION cleanup_rate_limit_hits() TO service_role;
