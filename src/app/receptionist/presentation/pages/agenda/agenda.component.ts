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
export class AgendaComponent {
  isLoading = false;
  hasError = false;

  viewMode: 'day' | 'week' = 'day';

  days: DayItem[] = this.buildWeek('2026-01-21');
  selectedDate = this.days[0]?.date ?? '2026-01-21';

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

  /* ======================
     ACTIONS
     ====================== */

  selectDay(date: string) {
    this.selectedDate = date;
  }

  setView(mode: 'day' | 'week') {
    this.viewMode = mode;
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

  private buildWeek(baseISO: string): DayItem[] {
    const base = new Date(baseISO + 'T00:00:00');
    const days: DayItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);

      days.push({
        date: d.toISOString().slice(0, 10),
        weekday: d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').toUpperCase(),
        day: d.toLocaleDateString('es-PE', { day: '2-digit' }),
      });
    }

    return days;
  }
}
