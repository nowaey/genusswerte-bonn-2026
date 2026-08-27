import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

    if (!voucher_code) return json({ error: "INVALID_VOUCHER_CODE" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gutschein laden, um tasting_type zu ermitteln
    const { data: voucher } = await supabase
      .from("vouchers")
      .select("tasting_type, status")
      .eq("voucher_code", voucher_code.toUpperCase().trim())
      .maybeSingle();

    if (!voucher || voucher.status !== "active") {
      return json({ error: "VOUCHER_NOT_FOUND" }, 400);
    }

    if (!voucher.tasting_type) {
      return json({ error: "TASTING_SLUG_MISSING" }, 400);
    }

    // Mindestvorlauf: frühestens übermorgen buchbar (heute + morgen nicht).
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    const minDateStr = minDate.toISOString().split("T")[0];

    // Verfügbare Termine aus dem View laden.
    // v_slot_availability filtert bereits: status='active', Kapazität frei, ab heute.
    const { data: slots, error } = await supabase
      .from("v_slot_availability")
      .select("id, slot_date, slot_time, available_seats")
      .eq("tasting_type", voucher.tasting_type)
      .gte("slot_date", minDateStr)
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });

    if (error) {
      console.error("get-available-slots query:", error);
      return json({ error: "UNKNOWN" }, 500);
    }

    const result = (slots || []).map((s) => ({
      slot_id:         s.id,
      slot_date:       s.slot_date,
      slot_time:       String(s.slot_time).substring(0, 5), // HH:MM
      available_seats: s.available_seats,
    }));

    return json(result);
  } catch (err) {
    console.error("get-available-slots:", err);
    return json({ error: "UNKNOWN" }, 500);
  }
});
