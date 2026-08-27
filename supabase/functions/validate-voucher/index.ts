import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const TASTING_LABELS: Record<string, string> = {
  wein_tasting:                  "Wein Tasting",
  afterwork_wein_tasting:        "Afterwork Wein Tasting",
  gin_tasting:                   "Gin Tasting",
  champagner_popcorn_tasting:    "Champagner & Popcorn",
  trueffel_champagner_tasting:   "Trüffel & Champagner",
  whisky_tasting:                "Whisky Tasting",
  craft_beer_tasting:            "Craft Beer Tasting",
  wagyu_wein_champagner_tasting: "Wagyu, Wein & Champagner",
  apero_antipasti_tasting:       "Apéro & Antipasti",
};

serve(async (req) => {
  // Pro Request neu berechnet — sonst koennten sich bei gleichzeitigen
  // Anfragen unterschiedlicher Herkunft die Origin-Header vermischen.
  const cors = getCorsHeaders(req.headers.get("origin"));
  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { voucher_code } = await req.json();

    if (!voucher_code || typeof voucher_code !== "string") {
      return json({ valid: false, error: "INVALID_VOUCHER_CODE" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: voucher, error } = await supabase
      .from("vouchers")
      .select("id, voucher_code, status, persons, valid_until, tasting_type")
      .eq("voucher_code", voucher_code.toUpperCase().trim())
      .maybeSingle();

    if (error || !voucher) {
      return json({ valid: false, error: "VOUCHER_NOT_FOUND" });
    }

    if (voucher.status === "scheduled" || voucher.status === "checked_in") {
      return json({ valid: false, error: "VOUCHER_ALREADY_RESERVED" });
    }
    if (voucher.status === "expired") {
      return json({ valid: false, error: "VOUCHER_EXPIRED" });
    }
    if (voucher.status !== "active") {
      return json({ valid: false, error: "VOUCHER_NOT_ACTIVE" });
    }

    // Ablauf zusätzlich per Datum prüfen (falls Status noch nicht nachgezogen wurde)
    const today = new Date().toISOString().split("T")[0];
    if (voucher.valid_until && voucher.valid_until < today) {
      return json({ valid: false, error: "VOUCHER_EXPIRED" });
    }

    return json({
      valid: true,
      tasting_name: TASTING_LABELS[voucher.tasting_type] || voucher.tasting_type,
      tasting_type: voucher.tasting_type,
      persons: voucher.persons ?? 1,
    });
  } catch (err) {
    console.error("validate-voucher:", err);
    return json({ valid: false, error: "UNKNOWN" }, 500);
  }
});
