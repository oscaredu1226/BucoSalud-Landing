import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class AgendaComponent {
  isLoading = false;
  hasError = false;

  viewMode: 'day' | 'week' = 'day';

  weekStartISO: string = this.startOfWeekISO(this.todayISO()); // lunes
  days: DayItem[] = this.buildWeekFromWeekStart(this.weekStartISO);
  selectedDate: string = this.todayISO();

  timeSlots: string[] = this.buildTimeSlots(8, 18);

  appointments: AgendaAppointment[] = [
    {
      id: 'APT-1',
      patientName: 'María García',
      phone: '987654321',
      dni: '12345678',
      date: '2026-01-21',
      time: '09:00',
      reason: 'Evaluación',
      status: 'Confirmada',
    },
    {
      id: 'APT-2',
      patientName: 'Juan Pérez',
      phone: '87654321',
      dni: '87654321',
      date: '2026-01-21',
      time: '10:30',
      reason: 'Control',
      status: 'Pendiente',
    },
  ];

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

  selectDay(date: string) {
    this.selectedDate = date;

    // ✅ si seleccionan un día fuera de la semana actual, saltamos a esa semana
    const w = this.startOfWeekISO(date);
    if (w !== this.weekStartISO) {
      this.weekStartISO = w;
      this.days = this.buildWeekFromWeekStart(this.weekStartISO);
    }
  }

  setView(mode: 'day' | 'week') {
    this.viewMode = mode;
  }

  // ✅ navegación de semanas
  prevWeek() {
    const d = new Date(this.weekStartISO + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    this.setWeek(this.toISODate(d));
  }

  nextWeek() {
    const d = new Date(this.weekStartISO + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    this.setWeek(this.toISODate(d));
  }

  goToToday() {
    const today = this.todayISO();
    this.setWeek(this.startOfWeekISO(today));
    this.selectedDate = today;
  }

  private setWeek(weekStartISO: string) {
    this.weekStartISO = weekStartISO;
    this.days = this.buildWeekFromWeekStart(this.weekStartISO);

    // ✅ si el selectedDate queda fuera, lo seteamos al primer día de la semana
    const inWeek = this.days.some(x => x.date === this.selectedDate);
    if (!inWeek) this.selectedDate = this.days[0]?.date ?? this.weekStartISO;
  }

  confirm(a: AgendaAppointment) {
    a.status = 'Confirmada';
  }

  cancel(a: AgendaAppointment) {
    a.status = 'Cancelada';
  }

  complete(a: AgendaAppointment) {
    a.status = 'Completada';
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
