import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AppointmentHttpRepository,
  AppointmentRow
} from '../../../infrastructure/http/repositories/appointment.http-repository';

type AppointmentStatus = 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';

type AgendaAppointment = {
  id: string;
  patientName: string;
  phone: string;
  dni: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
};

type DayItem = {
  date: string;
  weekday: string;
  day: string;
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

  weekStartISO: string = this.startOfWeekISO(this.todayISO());
  days: DayItem[] = this.buildWeekFromWeekStart(this.weekStartISO);
  selectedDate: string = this.todayISO();

  timeSlots: string[] = this.buildTimeSlots(8, 18);

  appointments: AgendaAppointment[] = [];

  // ✅ caches para render eficiente
  private apptsByDate = new Map<string, AgendaAppointment[]>();
  private slotMapForSelectedDate = new Map<string, AgendaAppointment>();

  async ngOnInit() {
    await this.loadWeekAppointments();
  }


  private async loadWeekAppointments() {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

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
    this.rebuildCaches();
    this.cdr.detectChanges();
  }

  private rebuildCaches() {
    this.apptsByDate.clear();

    for (const a of this.appointments) {
      const list = this.apptsByDate.get(a.date) ?? [];
      list.push(a);
      this.apptsByDate.set(a.date, list);
    }

    for (const [date, list] of this.apptsByDate.entries()) {
      list.sort((x, y) => x.time.localeCompare(y.time));
      this.apptsByDate.set(date, list);
    }

    this.rebuildSlotMapForSelectedDate();
  }

  private rebuildSlotMapForSelectedDate() {
    this.slotMapForSelectedDate.clear();
    const list = this.apptsByDate.get(this.selectedDate) ?? [];
    for (const a of list) this.slotMapForSelectedDate.set(a.time, a);
  }

  getAppointmentBySlot(time: string): AgendaAppointment | null {
    return this.slotMapForSelectedDate.get(time) ?? null;
  }

  hasAppointmentsForDate(date: string): boolean {
    return (this.apptsByDate.get(date)?.length ?? 0) > 0;
  }

  getAppointmentsForDate(date: string): AgendaAppointment[] {
    return this.apptsByDate.get(date) ?? [];
  }

  get weekLabel(): string {
    const start = new Date(this.weekStartISO + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth && sameYear) {
      const startLabel = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit' });
      const endDay = end.toLocaleDateString('es-PE', { day: '2-digit' });
      const year = end.getFullYear();
      return `${startLabel} – ${endDay}, ${year}`;
    }

    if (sameYear) {
      const startLabel = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit' });
      const endLabel = end.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });
      return `${startLabel} – ${endLabel}`;
    }

    const startLabel = start.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });
    const endLabel = end.toLocaleDateString('es-PE', { month: 'long', day: '2-digit', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }


  async selectDay(date: string) {
    this.selectedDate = date;

    const w = this.startOfWeekISO(date);
    if (w !== this.weekStartISO) {
      this.weekStartISO = w;
      this.days = this.buildWeekFromWeekStart(this.weekStartISO);
      await this.loadWeekAppointments();
      return;
    }

    this.rebuildSlotMapForSelectedDate();
  }

  setView(mode: 'day' | 'week') {
    this.viewMode = mode;
  }

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
    this.rebuildSlotMapForSelectedDate();
  }

  private async setWeek(weekStartISO: string) {
    this.weekStartISO = weekStartISO;
    this.days = this.buildWeekFromWeekStart(this.weekStartISO);

    const inWeek = this.days.some(x => x.date === this.selectedDate);
    if (!inWeek) this.selectedDate = this.days[0]?.date ?? this.weekStartISO;

    await this.loadWeekAppointments();
  }

  async complete(a: AgendaAppointment) {
    a.status = 'Completada';
    await this.persistStatus(a.id, 'completed');
  }

  private async persistStatus(id: string, dbStatus: string) {
    const { error } = await this.apptRepo.update(id, { status: dbStatus });
    if (error) {
      this.hasError = true;
      await this.loadWeekAppointments();
    } else {
      this.rebuildCaches();
      this.cdr.detectChanges();
    }
  }

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
    if (v === 'pending') return 'Pendiente';
    if (v === 'confirmed') return 'Confirmada';
    if (v === 'cancelled') return 'Cancelada';
    if (v === 'completed') return 'Completada';
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


  private buildTimeSlots(from: number, to: number): string[] {
    const slots: string[] = [];
    for (let h = from; h <= to; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h !== to) slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }

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

  private startOfWeekISO(dateISO: string): string {
    const d = new Date(dateISO + 'T00:00:00');
    const dow = d.getDay();
    const diff = (dow === 0 ? -6 : 1 - dow);
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
