// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LandingBookingPayload = {
  first_names: string;
  last_names: string;
  dni: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  tzOffsetMinutes?: number; // 👈 llega desde Angular
  website?: string | null;
};

// ✅ CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function okNoContent() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// ✅ Convierte "fecha+hora local del usuario" a ISO UTC usando offset del navegador
// tzOffsetMinutes: new Date().getTimezoneOffset()  (Lima => 300)
function parseLocalDateTimeToUtcIso(date: string, time: string, tzOffsetMinutes: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  if (![y, m, d, hh, mm].every(Number.isFinite)) throw new Error("Invalid date/time parts");

  // Interpretamos y/m/d hh:mm como "hora local" y la convertimos a UTC con offset del cliente
  const assumedUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const utcMs = assumedUtcMs + tzOffsetMinutes * 60_000;

  return new Date(utcMs).toISOString();
}

function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  return new Date(d.getTime() + minutes * 60_000).toISOString();
}

Deno.serve(async (req: Request) => {
  const rid = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (req.method === "OPTIONS") return okNoContent();
    if (req.method !== "POST") return json(405, { rid, error: "Method not allowed" });

    let payload: LandingBookingPayload;
    try {
      payload = await req.json();
    } catch {
      return json(400, { rid, error: "Invalid JSON" });
    }

    const { first_names, last_names, dni, phone, date, time, tzOffsetMinutes, website } = payload ?? {};

    console.log("landing-booking request", {
      rid,
      hasWebsite: Boolean(website),
      dni: dni ? String(dni).slice(0, 3) + "*****" : null,
      date,
      time,
      tzOffsetMinutes,
    });

    if (website) return json(200, { rid, success: true });

    if (!first_names || !last_names || !dni || !phone || !date || !time) {
      return json(400, { rid, error: "Missing required fields" });
    }

    const dniNorm = String(dni).trim();
    if (!/^\d{8}$/.test(dniNorm)) return json(400, { rid, error: "Invalid DNI" });

    const firstNorm = String(first_names).trim().slice(0, 60);
    const lastNorm = String(last_names).trim().slice(0, 60);
    const phoneNorm = String(phone).trim().slice(0, 30);

    // ✅ Date/time -> ISO UTC con timezone del navegador
    let startIso: string;
    try {
      const tz = typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 300; // fallback Lima
      startIso = parseLocalDateTimeToUtcIso(date, time, tz);
    } catch (e: any) {
      return json(400, { rid, error: e?.message ?? "Invalid date/time" });
    }

    const { data: settings, error: sErr } = await supabase
      .from("availability_settings")
      .select("slot_minutes")
      .limit(1)
      .maybeSingle();

    if (sErr) {
      console.error("settings error", { rid, sErr });
      return json(500, { rid, error: "Error reading settings", details: sErr });
    }

    const slotMinutes = settings?.slot_minutes ?? 60;
    const endIso = addMinutesIso(startIso, slotMinutes);

    console.log("computed slot", { rid, slotMinutes, startIso, endIso });

    const { data: existing, error: findErr } = await supabase
      .from("patients")
      .select("id")
      .eq("dni", dniNorm)
      .maybeSingle();

    if (findErr) {
      console.error("find patient error", { rid, findErr });
      return json(500, { rid, error: "Error searching patient", details: findErr });
    }

    let patientId: string;

    if (existing?.id) {
      patientId = existing.id;
      console.log("patient found", { rid, patientId });
    } else {
      const { data: created, error: createErr } = await supabase
        .from("patients")
        .insert({
          first_names: firstNorm,
          last_names: lastNorm,
          dni: dniNorm,
          phone: phoneNorm,
          email: null,
          notes: "Creado desde landing",
        })
        .select("id")
        .single();

      if (createErr) {
        console.error("create patient error", { rid, createErr });
        return json(500, { rid, error: "Error creating patient", details: createErr });
      }

      patientId = created.id;
      console.log("patient created", { rid, patientId });
    }

    const { data: blocked, error: bErr } = await supabase
      .from("blocked_slots")
      .select("id, start_at, end_at")
      .lt("start_at", endIso)
      .gt("end_at", startIso)
      .limit(1);

    if (bErr) {
      console.error("blocked check error", { rid, bErr });
      return json(500, { rid, error: "Error checking blocked slots", details: bErr });
    }
    if ((blocked ?? []).length > 0) {
      console.log("slot blocked", { rid, blocked: blocked?.[0] });
      return json(409, { rid, error: "SLOT_BLOCKED", blocked: blocked?.[0] });
    }

    const { data: overlap, error: oErr } = await supabase
      .from("appointments")
      .select("id, start_at, end_at")
      .lt("start_at", endIso)
      .gt("end_at", startIso)
      .limit(1);

    if (oErr) {
      console.error("overlap check error", { rid, oErr });
      return json(500, { rid, error: "Error checking overlaps", details: oErr });
    }
    if ((overlap ?? []).length > 0) {
      console.log("slot taken", { rid, overlap: overlap?.[0] });
      return json(409, { rid, error: "SLOT_TAKEN", overlap: overlap?.[0] });
    }

    const insertPayload: any = {
      patient_id: patientId,
      start_at: startIso,
      end_at: endIso,
      notes: "Cita solicitada desde landing",
    };

    console.log("appointment insert payload keys", { rid, keys: Object.keys(insertPayload) });

    const { data: createdAppt, error: cErr } = await supabase
      .from("appointments")
      .insert(insertPayload)
      .select("id")
      .single();

    if (cErr) {
      console.error("create appointment error", { rid, cErr, insertPayload });
      return json(500, { rid, error: "Error creating appointment", details: cErr });
    }

    const ms = Date.now() - startedAt;
    console.log("landing-booking success", { rid, appointment_id: createdAppt.id, ms });

    return json(200, { rid, success: true, appointment_id: createdAppt.id, ms });
  } catch (e: any) {
    console.error("unhandled error", { rid, e });
    return json(500, { rid, error: "Unhandled error", details: String(e?.message ?? e) });
  }
});

