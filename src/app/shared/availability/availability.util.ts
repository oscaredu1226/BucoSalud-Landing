export type DayKey = 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat';

export function dayKeyFromISO(dateISO: string): DayKey {
  const d = new Date(dateISO + 'T00:00:00');
  const map: DayKey[] = ['sun','mon','tue','wed','thu','fri','sat'];
  return map[d.getDay()];
}

export function parseHHmm(hhmm: string) {
  const [h, m] = (hhmm ?? '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hh: h, mm: m };
}

export function buildSlotsForDay(dateISO: string, startHHmm: string, endHHmm: string, slotMinutes: number): string[] {
  const s = parseHHmm(startHHmm);
  const e = parseHHmm(endHHmm);
  if (!s || !e || !slotMinutes) return [];

  const [y, mo, d] = dateISO.split('-').map(Number);
  const start = new Date(y, mo - 1, d, s.hh, s.mm, 0, 0);
  const endBoundary = new Date(y, mo - 1, d, e.hh, e.mm, 0, 0);

  const out: string[] = [];
  for (let cur = new Date(start); ; cur = new Date(cur.getTime() + slotMinutes * 60_000)) {
    const slotStart = new Date(cur);
    const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
    if (slotEnd.getTime() > endBoundary.getTime()) break;

    out.push(
      `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`
    );
  }
  return out;
}
