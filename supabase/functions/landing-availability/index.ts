// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WorkingHourDay = { start: string; end: string; enabled: boolean };
type WorkingHours = Record<"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun", WorkingHourDay>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? ""
);

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function okNoContent() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function parseHHmm(hhmm: string) {
  const [hh, mm] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function dowKeyFromDate(dateYYYYMMDD: string): keyof WorkingHours {
  const d = new Date(dateYYYYMMDD + "T00:00:00");
  const map: (keyof WorkingHours)[] = ["sun","mon","tue","wed","thu","fri","sat"];
  return map[d.getDay()];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime()
    && new Date(aEnd).getTime() > new Date(bStart).getTime();
}

// Convierte "hora local del cliente" => ISO UTC usando offset
function toUtcIsoFromLocal(date: string, time: string, tzOffsetMinutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  const assumedUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const utcMs = assumedUtcMs + tzOffsetMinutes * 60_000;

  return new Date(utcMs).toISOString();
}

function addMinutesIso(iso: string, minutes: number) {
  const d = new Date(iso);
  return new Date(d.getTime() + minutes * 60_000).toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return okNoContent();
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const rid = crypto.randomUUID();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { rid, error: "Invalid JSON" });
  }

  const date = String(body?.date ?? "").trim(); // YYYY-MM-DD
  const tzOffsetMinutes = typeof body?.tzOffsetMinutes === "number" ? body.tzOffsetMinutes : 300;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json(400, { rid, error: "Invalid date" });
  }

  // 1) settings
  const { data: settings, error: sErr } = await supabase
    .from("availability_settings")
    .select("slot_minutes, working_hours")
    .limit(1)
    .maybeSingle();

  if (sErr) return json(500, { rid, error: "Error reading settings", details: sErr });

  const slotMinutes = settings?.slot_minutes ?? 60;
  const workingHours = (settings?.working_hours ?? null) as WorkingHours | null;

  if (!workingHours) return json(200, { rid, availableHours: [] });

  const key = dowKeyFromDate(date);
  const dayCfg = workingHours[key];

  if (!dayCfg?.enabled) return json(200, { rid, availableHours: [] });

  const start = parseHHmm(dayCfg.start);
  const end = parseHHmm(dayCfg.end);
  if (!start || !end) return json(200, { rid, availableHours: [] });

  // 2) Generar slots (labels en local, ISO en UTC)
  const [y, m, d] = date.split("-").map(Number);
  let cursor = new Date(y, m - 1, d, start.hh, start.mm, 0, 0);
  const endBoundary = new Date(y, m - 1, d, end.hh, end.mm, 0, 0);

  const slots: { label: string; startIso: string; endIso: string }[] = [];

  while (cursor.getTime() + slotMinutes * 60_000 <= endBoundary.getTime()) {
    const label =
      `${String(cursor.getHours()).padStart(2, "0")}:` +
      `${String(cursor.getMinutes()).padStart(2, "0")}`;

    const startIso = toUtcIsoFromLocal(date, label, tzOffsetMinutes);
    const endIso = addMinutesIso(startIso, slotMinutes);

    slots.push({ label, startIso, endIso });

    cursor = new Date(cursor.getTime() + slotMinutes * 60_000);
  }

  // 3) Rango del día en UTC para filtrar citas/bloqueos
  const fromIso = toUtcIsoFromLocal(date, "00:00", tzOffsetMinutes);
  const toIso = toUtcIsoFromLocal(date, "23:59", tzOffsetMinutes);

  const [
    { data: appts, error: aErr },
    { data: blocks, error: bErr },
  ] = await Promise.all([
    supabase.from("appointments").select("start_at,end_at").lt("start_at", toIso).gt("end_at", fromIso).limit(5000),
    supabase.from("blocked_slots").select("start_at,end_at").lt("start_at", toIso).gt("end_at", fromIso).limit(5000),
  ]);

  if (aErr) return json(500, { rid, error: "Error reading appointments", details: aErr });
  if (bErr) return json(500, { rid, error: "Error reading blocked slots", details: bErr });

  const appointments = appts ?? [];
  const blocked = blocks ?? [];

  const free = slots.filter((slot) => {
    const occupiedByAppt = appointments.some((r: any) =>
      overlaps(r.start_at, r.end_at, slot.startIso, slot.endIso)
    );
    if (occupiedByAppt) return false;

    const occupiedByBlock = blocked.some((b: any) =>
      overlaps(b.start_at, b.end_at, slot.startIso, slot.endIso)
    );
    return !occupiedByBlock;
  });

  return json(200, { rid, availableHours: free.map((s) => s.label) });
});
