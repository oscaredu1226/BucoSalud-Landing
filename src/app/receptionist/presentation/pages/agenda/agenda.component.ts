import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppointmentHttpRepository, AppointmentRow } from '../../../infrastructure/http/repositories/appointment.http-repository';

type AppointmentStatus = 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';

type AgendaAppointment = {
  id: string;
  patientName: string;
  phone: string;
  dni: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  status: AppointmentStatus;
};

type DayItem = {
  date: string;      // YYYY-MM-DD
  weekday: string;   // LUN, MAR...
  day: string;       // 01..31
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.component.html',
})
export class AgendaComponent implements OnInit {
  constructor(
    private readonly apptRepo: AppointmentHttpRepository,
    private readonly cdr: ChangeDetectorRef
  ) {}

  isLoading = false;
  hasError = false;

  viewMode: 'day' | 'week' = 'day';

  weekStartISO: string = this.startOfWeekISO(this.todayISO()); // lunes
  days: DayItem[] = this.buildWeekFromWeekStart(this.weekStartISO);
  selectedDate: string = this.todayISO();

  timeSlots: string[] = this.buildTimeSlots(8, 18);

  // ✅ ahora viene de supabase
  appointments: AgendaAppointment[] = [];

  /* ======================
     INIT
     ====================== */

  async ngOnInit() {
    await this.loadWeekAppointments();
  }

  private async loadWeekAppointments() {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    // rango: [weekStart, weekStart+7)
    const fromIso = `${this.weekStartISO}T00:00:00.000Z`;
    const end = new Date(fromIso);
    end.setUTCDate(end.getUTCDate() + 7);
    const toIso = end.toISOString();

    const { data, error } = await this.apptRepo.listByDateRange(fromIso, toIso, 5000);

    this.isLoading = false;

    if (error) {
      this.hasError = true;
      this.cdr.detectChanges();
      return;
    }

    const rows = (data ?? []) as AppointmentRow[];

    this.appointments = rows.map((r: any) => this.toAgendaVM(r));
    this.cdr.detectChanges();
  }

  /* ======================
     GETTERS
     ====================== */

  get dayAppointments(): AgendaAppointment[] {
    return this.appointments
      .filter(a => a.date === this.selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  getAppointmentBySlot(time: string): AgendaAppointment | null {
    for (const a of this.dayAppointments) {
      if (a.time === time) return a;
    }
    return null;
  }

  hasAppointmentsForDate(date: string): boolean {
    for (const a of this.appointments) {
      if (a.date === date) return true;
    }
    return false;
  }

  // ✅ label tipo "enero 20 – enero 26, 2026"
  get weekLabel(): string {
    const start = new Date(this.weekStartISO + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();

    const startLabel = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit' });
    const endLabel = end.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });

    if (sameMonth && sameYear) {
      // ej: "enero 20 – 26, 2026"
      const startDay = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit' });
      const endDay = end.toLocaleDateString('es-PE', { day: '2-digit' });
      const year = end.getFullYear();
      return `${startDay} – ${endDay}, ${year}`;
    }

    if (sameYear) {
      // ej: "enero 28 – febrero 03, 2026"
      const startLabel2 = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit' });
      const endLabel2 = end.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });
      return `${startLabel2} – ${endLabel2}`;
    }

    // ej: cruza año
    const startLabel3 = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });
    const endLabel3 = end.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });
    return `${startLabel3} – ${endLabel3}`;
  }

  /* ======================
     ACTIONS
     ====================== */

  async selectDay(date: string) {
    this.selectedDate = date;

    // ✅ si seleccionan un día fuera de la semana actual, saltamos a esa semana
    const w = this.startOfWeekISO(date);
    if (w !== this.weekStartISO) {
      this.weekStartISO = w;
      this.days = this.buildWeekFromWeekStart(this.weekStartISO);
      await this.loadWeekAppointments();
    }
  }

  setView(mode: 'day' | 'week') {
    this.viewMode = mode;
  }

  // ✅ navegación de semanas
  async prevWeek() {
    const d = new Date(this.weekStartISO + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    await this.setWeek(this.toISODate(d));
  }

  async nextWeek() {
    const d = new Date(this.weekStartISO + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    await this.setWeek(this.toISODate(d));
  }

  async goToToday() {
    const today = this.todayISO();
    await this.setWeek(this.startOfWeekISO(today));
    this.selectedDate = today;
  }

  private async setWeek(weekStartISO: string) {
    this.weekStartISO = weekStartISO;
    this.days = this.buildWeekFromWeekStart(this.weekStartISO);

    // ✅ si el selectedDate queda fuera, lo seteamos al primer día de la semana
    const inWeek = this.days.some(x => x.date === this.selectedDate);
    if (!inWeek) this.selectedDate = this.days[0]?.date ?? this.weekStartISO;

    await this.loadWeekAppointments();
  }

  // ✅ opcional: actualizar estado en DB (si quieres que sea real)
  async confirm(a: AgendaAppointment) {
    a.status = 'Confirmada';
    await this.persistStatus(a.id, 'confirmed');
  }

  async cancel(a: AgendaAppointment) {
    a.status = 'Cancelada';
    await this.persistStatus(a.id, 'cancelled');
  }

  async complete(a: AgendaAppointment) {
    a.status = 'Completada';
    await this.persistStatus(a.id, 'completed');
  }

  private async persistStatus(id: string, dbStatus: string) {
    // no rompe tu UI: si falla, solo revierte recargando semana
    const { error } = await this.apptRepo.update(id, { status: dbStatus });
    if (error) {
      this.hasError = true;
      await this.loadWeekAppointments();
    }
  }

  /* ======================
     MAPPING (DB -> UI)
     ====================== */

  private toAgendaVM(r: any): AgendaAppointment {
    const p = r.patient ?? null;

    const fullName = p
      ? `${p.first_names ?? ''} ${p.last_names ?? ''}`.trim()
      : '(Sin paciente)';

    const { date, time } = this.splitDateTimeLocal(r.start_at);

    return {
      id: r.id,
      patientName: fullName || '(Sin paciente)',
      phone: p?.phone ?? '—',
      dni: p?.dni ? String(p.dni) : '—',
      date,
      time,
      reason: r.reason ?? '—',
      status: this.mapDbStatusToUi(r.status),
    };
  }

  private mapDbStatusToUi(s: any): AppointmentStatus {
    const v = String(s ?? '').toLowerCase();

    // tu enum real en DB: pending, confirmed, cancelled (y opcional completed)
    if (v === 'pending') return 'Pendiente';
    if (v === 'confirmed') return 'Confirmada';
    if (v === 'cancelled') return 'Cancelada';
    if (v === 'completed') return 'Completada';

    // fallback por si ya viene en español
    if (v === 'pendiente') return 'Pendiente';
    if (v === 'confirmada') return 'Confirmada';
    if (v === 'cancelada') return 'Cancelada';
    if (v === 'completada') return 'Completada';

    // default seguro
    return 'Confirmada';
  }

  private splitDateTimeLocal(iso: string): { date: string; time: string } {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: this.todayISO(), time: '00:00' };

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');

    return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` };
  }

  /* ======================
     HELPERS
     ====================== */

  private buildTimeSlots(from: number, to: number): string[] {
    const slots: string[] = [];
    for (let h = from; h <= to; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h !== to) slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }

  // ✅ semana desde lunes (weekStartISO)
  private buildWeekFromWeekStart(weekStartISO: string): DayItem[] {
    const base = new Date(weekStartISO + 'T00:00:00');
    const days: DayItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);

      days.push({
        date: this.toISODate(d),
        weekday: d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').toUpperCase(),
        day: d.toLocaleDateString('es-PE', { day: '2-digit' }),
      });
    }

    return days;
  }

  // ✅ lunes como inicio de semana
  private startOfWeekISO(dateISO: string): string {
    const d = new Date(dateISO + 'T00:00:00');
    const dow = d.getDay(); // 0=dom..6=sab
    const diff = (dow === 0 ? -6 : 1 - dow); // mover a lunes
    d.setDate(d.getDate() + diff);
    return this.toISODate(d);
  }

  private todayISO(): string {
    return this.toISODate(new Date());
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
