import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type AppointmentStatus = 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';

type AppointmentRow = {
  id: string;
  patientName: string;
  dni: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  status: AppointmentStatus;
  notes?: string;
};

type CalendarCell = {
  iso: string;          // YYYY-MM-DD
  day: number;          // 1..31
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments-list.component.html',
})
export class AppointmentsListComponent {
  constructor(private readonly router: Router) {}

  isLoading = false;
  hasError = false;

  // filtros
  q = '';
  status: 'all' | AppointmentStatus = 'all';
  dateFilter: string = this.todayISO(); // ✅ arranca HOY
  isDatePickerOpen = false;

  // dropdown por fila (acciones)
  openRowMenuId: string | null = null;

  // modal nueva cita
  isCreateModalOpen = false;

  // =========================
  // ✅ Modal Reprogramar Cita
  // =========================
  isRescheduleModalOpen = false;
  rescheduleRow: AppointmentRow | null = null;
  rescheduleDate: string = this.todayISO();
  rescheduleTime: string = '';

  // =========================
  // ✅ Modal Detalles Cita
  // =========================
  isDetailModalOpen = false;
  detailRow: AppointmentRow | null = null;

  // form modal (mock)
  formPatientQuery = '';
  formDate: string = this.todayISO();
  formHour: string = '';
  formNotes = '';
  readonly hours: string[] = this.buildHours(10, 18);

  // ✅ CALENDARIO CUSTOM (para filtro)
  viewMonth = this.startOfMonthISO(this.todayISO()); // YYYY-MM-01
  calendarWeeks: CalendarCell[][] = [];
  readonly weekLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  rows: AppointmentRow[] = [
    {
      id: 'APT-1001',
      patientName: 'María Pérez',
      dni: '74219833',
      phone: '+51 987 654 321',
      date: '2026-01-22',
      time: '09:00',
      reason: 'Control de rutina',
      status: 'Confirmada',
      notes: 'Control de rutina',
    },
    {
      id: 'APT-1002',
      patientName: 'Juan Pérez',
      dni: '87654321',
      phone: '+51 999 222 111',
      date: '2026-01-22',
      time: '10:30',
      reason: 'Evaluación',
      status: 'Pendiente',
      notes: '',
    },
    {
      id: 'APT-1003',
      patientName: 'Ana López',
      dni: '11223344',
      phone: '+51 981 333 777',
      date: '2026-01-22',
      time: '14:00',
      reason: 'Consulta',
      status: 'Cancelada',
      notes: '',
    },
  ];

  // =========================
  // Computed / Helpers
  // =========================
  get filteredRows(): AppointmentRow[] {
    const q = this.q.trim().toLowerCase();

    return this.rows
      .filter((r) => (this.status === 'all' ? true : r.status === this.status))
      .filter((r) => (this.dateFilter ? r.date === this.dateFilter : true))
      .filter((r) => {
        if (!q) return true;
        return (
          r.patientName.toLowerCase().includes(q) ||
          r.dni.includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
        );
      });
  }

  trackById = (_: number, row: AppointmentRow) => row.id;

  formatDateES(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const y = iso.slice(0, 4);
    const m = iso.slice(5, 7);
    const d = iso.slice(8, 10);
    return `${d}/${m}/${y}`;
  }

  // =========================
  // ✅ Date picker (custom)
  // =========================
  toggleDatePicker() {
    this.isDatePickerOpen = !this.isDatePickerOpen;
    this.openRowMenuId = null;

    if (this.isDatePickerOpen) {
      const base = this.dateFilter || this.todayISO();
      this.viewMonth = this.startOfMonthISO(base);
      this.rebuildCalendar();
    }
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  clearDateFilter() {
    this.dateFilter = '';
    this.rebuildCalendar();
  }

  get monthLabel(): string {
    const d = new Date(this.viewMonth + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    const d = new Date(this.viewMonth + 'T00:00:00');
    d.setMonth(d.getMonth() - 1);
    this.viewMonth = this.toISODate(d).slice(0, 7) + '-01';
    this.rebuildCalendar();
  }

  nextMonth() {
    const d = new Date(this.viewMonth + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    this.viewMonth = this.toISODate(d).slice(0, 7) + '-01';
    this.rebuildCalendar();
  }

  pickDate(cell: CalendarCell) {
    this.dateFilter = cell.iso;
    this.closeDatePicker();
  }

  private rebuildCalendar() {
    const today = this.todayISO();
    const selected = this.dateFilter;

    const first = new Date(this.viewMonth + 'T00:00:00'); // YYYY-MM-01
    const startDow = first.getDay(); // 0..6

    const start = new Date(first);
    start.setDate(first.getDate() - startDow);

    const weeks: CalendarCell[][] = [];

    for (let w = 0; w < 6; w++) {
      const row: CalendarCell[] = [];
      for (let i = 0; i < 7; i++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + i);

        const iso = this.toISODate(cur);
        const inMonth = cur.getMonth() === first.getMonth() && cur.getFullYear() === first.getFullYear();

        row.push({
          iso,
          day: cur.getDate(),
          inMonth,
          isToday: iso === today,
          isSelected: !!selected && iso === selected,
        });
      }
      weeks.push(row);
    }

    this.calendarWeeks = weeks;
  }

  // =========================
  // Row menu
  // =========================
  toggleRowMenu(rowId: string) {
    this.isDatePickerOpen = false;
    this.openRowMenuId = this.openRowMenuId === rowId ? null : rowId;
  }

  closeRowMenu() {
    this.openRowMenuId = null;
  }

  // lo dejo por si lo quieres usar después (ruta)
  goToDetail(row: AppointmentRow) {
    this.closeRowMenu();
    this.router.navigate(['/receptionist/appointments', row.id]);
  }

  // lo dejo por si lo quieres usar después (ruta)
  goToReschedule(row: AppointmentRow) {
    this.closeRowMenu();
    this.router.navigate(['/receptionist/appointments', row.id, 'reschedule']);
  }

  deleteRow(row: AppointmentRow) {
    this.closeRowMenu();
    this.rows = this.rows.filter((r) => r.id !== row.id);
  }

  // =========================
  // ✅ Modal Detalles
  // =========================
  openDetailModal(row: AppointmentRow) {
    this.closeRowMenu();
    this.isDatePickerOpen = false;

    this.detailRow = row;
    this.isDetailModalOpen = true;
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.detailRow = null;
  }

  // =========================
  // ✅ Modal Reprogramar
  // =========================
  openRescheduleModal(row: AppointmentRow) {
    this.closeRowMenu();
    this.isDatePickerOpen = false;

    this.rescheduleRow = row;
    this.rescheduleDate = row.date;
    this.rescheduleTime = row.time || this.hours[0] || '10:00';

    this.isRescheduleModalOpen = true;
  }

  closeRescheduleModal() {
    this.isRescheduleModalOpen = false;
    this.rescheduleRow = null;
  }

  saveReschedule() {
    if (!this.rescheduleRow) return;
    if (!this.rescheduleDate || !this.rescheduleTime) return;

    const id = this.rescheduleRow.id;

    this.rows = this.rows.map((r) =>
      r.id === id ? { ...r, date: this.rescheduleDate, time: this.rescheduleTime } : r
    );

    // opcional: si el modal de detalles estaba abierto para esa misma cita, actualízalo también
    if (this.detailRow?.id === id) {
      this.detailRow = { ...this.detailRow, date: this.rescheduleDate, time: this.rescheduleTime };
    }

    this.closeRescheduleModal();
  }

  // =========================
  // Modal Nueva Cita
  // =========================
  openCreateModal() {
    this.isCreateModalOpen = true;
    this.openRowMenuId = null;
    this.isDatePickerOpen = false;

    this.formPatientQuery = '';
    this.formDate = this.todayISO();
    this.formHour = '';
    this.formNotes = '';
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  createAppointment() {
    if (!this.formPatientQuery.trim() || !this.formDate || !this.formHour) return;

    const nextId = this.nextId();

    const newRow: AppointmentRow = {
      id: nextId,
      patientName: this.formPatientQuery.trim(),
      dni: '—',
      phone: '—',
      date: this.formDate,
      time: this.formHour,
      reason: '—',
      status: 'Pendiente',
      notes: this.formNotes?.trim() || '',
    };

    this.rows = [newRow, ...this.rows];
    this.closeCreateModal();
  }

  resetFilters() {
    this.q = '';
    this.status = 'all';
    this.dateFilter = this.todayISO();
    this.rebuildCalendar();
    this.closeDatePicker();
    this.closeRowMenu();
  }

  // =========================
  // Click outside close
  // =========================
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const insidePopover = !!target.closest('[data-popover]');
    if (insidePopover) return;

    this.closeRowMenu();
    this.closeDatePicker();
  }

  // =========================
  // utils
  // =========================
  private todayISO(): string {
    const d = new Date();
    return this.toISODate(d);
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private startOfMonthISO(iso: string): string {
    return iso.slice(0, 7) + '-01';
  }

  private buildHours(from: number, to: number): string[] {
    const out: string[] = [];
    for (let h = from; h <= to; h++) out.push(`${String(h).padStart(2, '0')}:00`);
    return out;
  }

  private nextId(): string {
    let max = 1000;
    for (const r of this.rows) {
      const n = Number(r.id.replace('APT-', ''));
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
    return `APT-${max + 1}`;
  }
}
