import { Component, HostListener, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../../../shared/toast/toast.service';

import { PatientHttpRepository, PatientRow } from '../../../../infrastructure/http/repositories/patient.http-repository';
import {
  AppointmentHttpRepository,
  BlockedSlotRow,
  AvailabilitySettingsRow,
} from '../../../../infrastructure/http/repositories/appointment.http-repository';

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

type AppointmentVM = {
  id: string;

  patientId: string;
  patientName: string;
  dni: string;
  phone: string;

  date: string; // YYYY-MM-DD
  time: string; // HH:mm

  reason: string;
  status: AppointmentStatus;
  notes?: string;

  _durationMin?: number;
};

type CalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

type WorkingHourDay = { start: string; end: string; enabled: boolean };
type WorkingHours = Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', WorkingHourDay>;

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments-list.component.html',
})
export class AppointmentsListComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly patientsRepo: PatientHttpRepository,
    private readonly apptRepo: AppointmentHttpRepository,
    private readonly cdr: ChangeDetectorRef
  ) {}

  isLoading = false;
  hasError = false;

  // filtros
  q = '';
  status: 'all' | AppointmentStatus = 'all';
  dateFilter: string = this.todayISO();
  isDatePickerOpen = false;

  // dropdown por fila (acciones)
  openRowMenuId: string | null = null;

  // modal nueva cita
  isCreateModalOpen = false;

  // modal reprogramar
  isRescheduleModalOpen = false;
  rescheduleRow: AppointmentVM | null = null;
  rescheduleDate: string = this.todayISO();
  rescheduleTime: string = '';

  // modal detalles
  isDetailModalOpen = false;
  detailRow: AppointmentVM | null = null;

  // confirm cancelar
  isConfirmDeleteOpen = false;
  confirmTitle = 'Cancelar cita';
  confirmMessage = '¿Seguro que deseas cancelar esta cita?';
  pendingDeleteRow: AppointmentVM | null = null;

  // form modal
  formPatientQuery = '';
  formDate: string = this.todayISO();
  formHour: string = '';
  formNotes = '';

  // base hours (fallback si no hay settings)
  readonly hours: string[] = this.buildHours(10, 18);

  // opciones filtradas
  createHourOptions: string[] = [];
  rescheduleHourOptions: string[] = [];

  // bloqueos cacheados por día
  private blocksByDate = new Map<string, BlockedSlotRow[]>();

  // disponibilidad cache (availability_settings)
  private availability: AvailabilitySettingsRow | null = null;
  private workingHours: WorkingHours | null = null;
  private slotMinutes = 30;

  // autocomplete paciente
  selectedPatient: PatientRow | null = null;
  patientResults: PatientRow[] = [];
  isPatientDropdownOpen = false;
  isPatientSearching = false;
  private patientSearchTimer: any = null;

  // calendario filtro
  viewMonth = this.startOfMonthISO(this.todayISO());
  calendarWeeks: CalendarCell[][] = [];
  readonly weekLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // citas
  rows: AppointmentVM[] = [];

  // =========================
  // INIT
  // =========================
  async ngOnInit() {
    this.rebuildCalendar();

    await this.ensureAvailabilityLoaded();
    await this.loadAppointments();

    await this.refreshCreateHourOptions(this.formDate);
  }

  // 👇 IMPORTANTE: no private (por si en HTML llamas reintentar)
  async loadAppointments() {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    let fromIso = '';
    let toIso = '';

    if (this.dateFilter) {
      // ojo: esto filtra por start_at en UTC; está OK para lista
      fromIso = `${this.dateFilter}T00:00:00.000Z`;
      const next = new Date(fromIso);
      next.setUTCDate(next.getUTCDate() + 1);
      toIso = next.toISOString();
    }

    const resp = this.dateFilter
      ? await this.apptRepo.listByDateRange(fromIso, toIso, 500)
      : await this.apptRepo.list(500);

    this.isLoading = false;

    const { data, error } = resp as any;

    if (error) {
      this.hasError = true;
      this.toast.error('Error', error.message ?? 'No se pudieron cargar las citas');
      this.cdr.detectChanges();
      return;
    }

    this.rows = (data ?? []).map((r: any) => this.toVM(r));
    this.cdr.detectChanges();
  }

  // =========================
  // Computed
  // =========================
  get filteredRows(): AppointmentVM[] {
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

  trackById = (_: number, row: AppointmentVM) => row.id;

  formatDateES(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const y = iso.slice(0, 4);
    const m = iso.slice(5, 7);
    const d = iso.slice(8, 10);
    return `${d}/${m}/${y}`;
  }

  // =========================
  // DISPONIBILIDAD (availability_settings)
  // =========================
  private async ensureAvailabilityLoaded() {
    if (this.availability) return;

    const { data, error } = await this.apptRepo.getAvailabilitySettings();
    if (error) {
      this.toast.error('Error', error.message ?? 'No se pudo cargar disponibilidad');
      this.availability = null;
      this.workingHours = null;
      this.slotMinutes = 30;
      return;
    }

    this.availability = data ?? null;

    const wh = (data?.working_hours ?? null) as WorkingHours | null;
    this.workingHours = wh;
    this.slotMinutes = Number(data?.slot_minutes ?? 30);
  }

  private dowKeyFromDate(dateIso: string): keyof WorkingHours {
    // 0=Sun ... 6=Sat
    const d = new Date(dateIso + 'T00:00:00');
    const dow = d.getDay();
    const map: (keyof WorkingHours)[] = ['sun','mon','tue','wed','thu','fri','sat'];
    return map[dow];
  }

  private isDayEnabled(dateIso: string): boolean {
    if (!this.workingHours) return true; // fallback: permitir si no hay settings
    const key = this.dowKeyFromDate(dateIso);
    return !!this.workingHours[key]?.enabled;
  }

  // =========================
  // ✅ Autocomplete paciente
  // =========================
  private patientLabel(p: PatientRow): string {
    const fullName = `${p.first_names ?? ''} ${p.last_names ?? ''}`.trim();
    return `${fullName || '(Sin nombre)'} · DNI ${p.dni}`;
  }

  onPatientFocus() {
    this.isPatientDropdownOpen = true;
    this.onPatientInputChange();
  }

  onPatientInputChange() {
    const q = this.formPatientQuery.trim();

    this.selectedPatient = null;
    this.isPatientDropdownOpen = true;

    if (this.patientSearchTimer) clearTimeout(this.patientSearchTimer);

    if (!q) {
      this.patientResults = [];
      this.isPatientSearching = false;
      this.cdr.detectChanges();
      return;
    }

    this.isPatientSearching = true;
    this.cdr.detectChanges();

    this.patientSearchTimer = setTimeout(async () => {
      const { data, error } = await this.patientsRepo.searchByNameOrDni(q, 8);

      this.isPatientSearching = false;

      if (error) {
        this.patientResults = [];
        this.toast.error('Error', error.message ?? 'No se pudo buscar el paciente');
        this.cdr.detectChanges();
        return;
      }

      this.patientResults = (data ?? []) as PatientRow[];
      this.cdr.detectChanges();
    }, 250);
  }

  selectPatient(p: PatientRow) {
    this.selectedPatient = p;
    this.formPatientQuery = this.patientLabel(p);
    this.isPatientDropdownOpen = false;
    this.patientResults = [];
    this.cdr.detectChanges();
  }

  // =========================
  // Date picker
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

  async clearDateFilter() {
    this.dateFilter = '';
    this.rebuildCalendar();
    this.toast.info('Filtro limpiado', 'Ahora estás viendo todas las fechas');
    await this.loadAppointments();
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

  async pickDate(cell: CalendarCell) {
    this.dateFilter = cell.iso;
    this.closeDatePicker();
    this.toast.info('Filtro aplicado', `Fecha: ${this.formatDateES(cell.iso)}`);
    await this.loadAppointments();
  }

  private rebuildCalendar() {
    const today = this.todayISO();
    const selected = this.dateFilter;

    const first = new Date(this.viewMonth + 'T00:00:00');
    const startDow = first.getDay();

    const start = new Date(first);
    start.setDate(first.getDate() - startDow);

    const weeks: CalendarCell[][] = [];

    for (let w = 0; w < 6; w++) {
      const row: CalendarCell[] = [];
      for (let i = 0; i < 7; i++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + i);

        const iso = this.toISODate(cur);
        const inMonth =
          cur.getMonth() === first.getMonth() &&
          cur.getFullYear() === first.getFullYear();

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

  // =========================
  // Cancelación
  // =========================
  requestDelete(row: AppointmentVM) {
    this.closeRowMenu();
    this.isDatePickerOpen = false;

    this.pendingDeleteRow = row;
    this.confirmTitle = 'Cancelar cita';
    this.confirmMessage = `¿Seguro que deseas cancelar la cita ${row.id}?`;
    this.isConfirmDeleteOpen = true;
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen = false;
    this.pendingDeleteRow = null;
  }

  async confirmDelete() {
    const row = this.pendingDeleteRow;
    if (!row) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    const { error } = await this.apptRepo.remove(row.id);

    this.isLoading = false;

    if (error) {
      this.toast.error('Error', error.message ?? 'No se pudo cancelar');
      this.cdr.detectChanges();
      return;
    }

    this.rows = this.rows.filter((r) => r.id !== row.id);
    this.toast.success('Cita cancelada', `Se canceló ${row.id}`);

    if (this.detailRow?.id === row.id) this.closeDetailModal();
    if (this.rescheduleRow?.id === row.id) this.closeRescheduleModal();

    this.closeConfirmDelete();
    this.cdr.detectChanges();
  }

  // =========================
  // Detalles
  // =========================
  openDetailModal(row: AppointmentVM) {
    this.closeRowMenu();
    this.isDatePickerOpen = false;

    this.detailRow = row;
    this.isDetailModalOpen = true;
    this.toast.info('Detalles', `Abriendo ${row.id}`);
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.detailRow = null;
  }

  // =========================
  // Reprogramar
  // =========================
  async openRescheduleModal(row: AppointmentVM) {
    this.closeRowMenu();
    this.isDatePickerOpen = false;

    this.rescheduleRow = row;
    this.rescheduleDate = row.date;
    this.rescheduleTime = row.time || this.hours[0] || '10:00';

    await this.refreshRescheduleHourOptions(this.rescheduleDate);

    if (this.rescheduleTime && !this.rescheduleHourOptions.includes(this.rescheduleTime)) {
      this.rescheduleTime = this.rescheduleHourOptions[0] || '';
    }

    this.isRescheduleModalOpen = true;
    this.cdr.detectChanges();
  }

  closeRescheduleModal() {
    this.isRescheduleModalOpen = false;
    this.rescheduleRow = null;
  }

  async onRescheduleDateChange() {
    await this.refreshRescheduleHourOptions(this.rescheduleDate);

    if (this.rescheduleTime && !this.rescheduleHourOptions.includes(this.rescheduleTime)) {
      this.rescheduleTime = this.rescheduleHourOptions[0] || '';
    }

    this.cdr.detectChanges();
  }

  async saveReschedule() {
    if (!this.rescheduleRow) {
      this.toast.error('Error', 'No se encontró la cita a reprogramar');
      return;
    }

    if (!this.rescheduleDate || !this.rescheduleTime) {
      this.toast.error('Campos incompletos', 'Selecciona fecha y hora');
      return;
    }

    await this.ensureAvailabilityLoaded();

    if (!this.isDayEnabled(this.rescheduleDate)) {
      this.toast.error('Día no disponible', 'Ese día está deshabilitado en disponibilidad');
      return;
    }

    const id = this.rescheduleRow.id;
    const duration = this.rescheduleRow._durationMin ?? this.slotMinutes ?? 30;

    const startAtIso = this.combineDateTimeISO(this.rescheduleDate, this.rescheduleTime);
    const endAtIso = this.addMinutesISO(startAtIso, duration);

    const blockedOrBusy = await this.isRangeBlockedOrBusy(this.rescheduleDate, startAtIso, endAtIso, id);
    if (blockedOrBusy) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    const { error } = await this.apptRepo.update(id, {
      start_at: startAtIso,
      end_at: endAtIso,
    });

    this.isLoading = false;

    if (error) {
      this.toast.error('Error', error.message ?? 'No se pudo reprogramar');
      this.cdr.detectChanges();
      return;
    }

    this.rows = this.rows.map((r) =>
      r.id === id ? { ...r, date: this.rescheduleDate, time: this.rescheduleTime } : r
    );

    if (this.detailRow?.id === id) {
      this.detailRow = { ...this.detailRow, date: this.rescheduleDate, time: this.rescheduleTime };
    }

    this.closeRescheduleModal();
    this.toast.success('Cita reprogramada', `${id} → ${this.formatDateES(this.rescheduleDate)} ${this.rescheduleTime}`);
    this.cdr.detectChanges();
  }

  // =========================
  // Nueva cita
  // =========================
  async openCreateModal() {
    this.isCreateModalOpen = true;
    this.openRowMenuId = null;
    this.isDatePickerOpen = false;

    this.formPatientQuery = '';
    this.selectedPatient = null;
    this.patientResults = [];
    this.isPatientDropdownOpen = false;
    this.isPatientSearching = false;

    this.formDate = this.todayISO();
    this.formNotes = '';

    await this.ensureAvailabilityLoaded();
    await this.refreshCreateHourOptions(this.formDate);

    this.formHour = this.createHourOptions[0] || '';
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.isPatientDropdownOpen = false;
    this.patientResults = [];
  }

  async onCreateDateChange() {
    await this.refreshCreateHourOptions(this.formDate);

    if (this.formHour && !this.createHourOptions.includes(this.formHour)) {
      this.formHour = this.createHourOptions[0] || '';
    }

    this.cdr.detectChanges();
  }

  async createAppointment() {
    if (!this.selectedPatient) {
      this.toast.error('Paciente', 'Selecciona un paciente de la lista');
      return;
    }
    if (!this.formDate) {
      this.toast.error('Campos incompletos', 'Selecciona una fecha');
      return;
    }
    if (!this.formHour) {
      this.toast.error('Campos incompletos', 'Selecciona una hora');
      return;
    }

    await this.ensureAvailabilityLoaded();

    if (!this.isDayEnabled(this.formDate)) {
      this.toast.error('Día no disponible', 'Ese día está deshabilitado en disponibilidad');
      return;
    }

    const patient = this.selectedPatient;

    const startAtIso = this.combineDateTimeISO(this.formDate, this.formHour);
    const endAtIso = this.addMinutesISO(startAtIso, this.slotMinutes ?? 30);

    const blockedOrBusy = await this.isRangeBlockedOrBusy(this.formDate, startAtIso, endAtIso, null);
    if (blockedOrBusy) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    const { data, error } = await this.apptRepo.create({
      patient_id: patient.id,
      start_at: startAtIso,
      end_at: endAtIso,
      status: 'confirmed',
      notes: this.formNotes?.trim() || null,
    });

    this.isLoading = false;

    if (error) {
      this.toast.error('Error', error.message ?? 'No se pudo crear la cita');
      this.cdr.detectChanges();
      return;
    }

    if (!data) {
      this.toast.error('Error', 'No se pudo crear la cita');
      this.cdr.detectChanges();
      return;
    }

    const vm: AppointmentVM = this.toVM({
      ...data,
      patient: {
        id: patient.id,
        first_names: patient.first_names,
        last_names: patient.last_names,
        dni: patient.dni,
        phone: patient.phone,
      },
    });

    this.rows = [vm, ...this.rows];
    this.closeCreateModal();

    this.toast.success('Cita creada', `${vm.patientName} · ${this.formatDateES(vm.date)} ${vm.time}`);
    this.cdr.detectChanges();
  }

  async resetFilters() {
    this.q = '';
    this.status = 'all';
    this.dateFilter = this.todayISO();
    this.rebuildCalendar();
    this.closeDatePicker();
    this.closeRowMenu();

    this.toast.info('Filtros reseteados', 'Mostrando citas de hoy');
    await this.loadAppointments();
  }

  // =========================
  // ✅ HORAS DISPONIBLES (incluye validación de día habilitado)
  // =========================
  private async refreshCreateHourOptions(dateIso: string) {
    await this.ensureAvailabilityLoaded();

    if (!dateIso) {
      this.createHourOptions = [...this.hours];
      return;
    }

    // 🔥 si el día está deshabilitado: 0 horas
    if (!this.isDayEnabled(dateIso)) {
      this.createHourOptions = [];
      return;
    }

    await this.ensureBlocksLoaded(dateIso);

    const duration = this.slotMinutes ?? 30;

    this.createHourOptions = this.hours.filter((hhmm) => {
      const startIso = this.combineDateTimeISO(dateIso, hhmm);
      const endIso = this.addMinutesISO(startIso, duration);
      return this.isFreeLocal(dateIso, startIso, endIso, null);
    });

    this.cdr.detectChanges();
  }

  private async refreshRescheduleHourOptions(dateIso: string) {
    await this.ensureAvailabilityLoaded();

    if (!dateIso) {
      this.rescheduleHourOptions = [...this.hours];
      return;
    }

    if (!this.isDayEnabled(dateIso)) {
      this.rescheduleHourOptions = [];
      return;
    }

    await this.ensureBlocksLoaded(dateIso);

    const duration = this.rescheduleRow?._durationMin ?? this.slotMinutes ?? 30;
    const ignoreId = this.rescheduleRow?.id ?? null;

    this.rescheduleHourOptions = this.hours.filter((hhmm) => {
      const startIso = this.combineDateTimeISO(dateIso, hhmm);
      const endIso = this.addMinutesISO(startIso, duration);
      return this.isFreeLocal(dateIso, startIso, endIso, ignoreId);
    });

    this.cdr.detectChanges();
  }

  private async ensureBlocksLoaded(dateIso: string) {
    if (this.blocksByDate.has(dateIso)) return;

    const fromIso = this.combineDateTimeISO(dateIso, '00:00'); // ✅ local
    const toIso = this.addMinutesISO(fromIso, 24 * 60);

    const { data, error } = await this.apptRepo.listBlockedSlotsByDayRange(fromIso, toIso, 500);

    if (error) {
      this.toast.error('Error', error.message ?? 'No se pudieron cargar bloqueos');
      this.blocksByDate.set(dateIso, []);
      this.cdr.detectChanges();
      return;
    }

    this.blocksByDate.set(dateIso, (data ?? []) as BlockedSlotRow[]);
  }

  private async isRangeBlockedOrBusy(dateIso: string, startIso: string, endIso: string, ignoreAppointmentId: string | null) {
    // 0) disponibilidad del día (seguridad extra)
    await this.ensureAvailabilityLoaded();
    if (!this.isDayEnabled(dateIso)) {
      this.toast.error('Día no disponible', 'Ese día está deshabilitado en disponibilidad');
      return true;
    }

    // 1) bloqueos en server
    const { data: blocks, error: blockErr } = await this.apptRepo.listBlockedSlotsByRange(startIso, endIso, 50);

    if (blockErr) {
      this.toast.error('Error', blockErr.message ?? 'No se pudo validar bloqueos');
      this.cdr.detectChanges();
      return true;
    }

    if ((blocks ?? []).length > 0) {
      const b: any = (blocks as any[])[0];
      this.toast.error('Horario bloqueado', `${b?.reason ?? 'Bloqueo'}`);
      this.cdr.detectChanges();
      return true;
    }

    // 2) citas ocupadas (rows local)
    const busy = this.rows
      .filter((r) => r.date === dateIso)
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => (ignoreAppointmentId ? r.id !== ignoreAppointmentId : true))
      .some((r) => {
        const dur = r._durationMin ?? this.slotMinutes ?? 30;
        const aStart = this.combineDateTimeISO(r.date, r.time);
        const aEnd = this.addMinutesISO(aStart, dur);
        return this.overlaps(startIso, endIso, aStart, aEnd);
      });

    if (busy) {
      this.toast.error('Horario ocupado', 'Ya existe una cita en ese horario');
      this.cdr.detectChanges();
      return true;
    }

    return false;
  }

  private isFreeLocal(dateIso: string, startIso: string, endIso: string, ignoreAppointmentId: string | null): boolean {
    // bloqueos del día (cache)
    const dayBlocks = this.blocksByDate.get(dateIso) ?? [];
    const isBlocked = dayBlocks.some((b) => this.overlaps(startIso, endIso, b.start_at, b.end_at));
    if (isBlocked) return false;

    // citas ocupadas
    const isBusy = this.rows
      .filter((r) => r.date === dateIso)
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => (ignoreAppointmentId ? r.id !== ignoreAppointmentId : true))
      .some((r) => {
        const dur = r._durationMin ?? this.slotMinutes ?? 30;
        const aStart = this.combineDateTimeISO(r.date, r.time);
        const aEnd = this.addMinutesISO(aStart, dur);
        return this.overlaps(startIso, endIso, aStart, aEnd);
      });

    return !isBusy;
  }

  private overlaps(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string): boolean {
    const aStart = new Date(aStartIso).getTime();
    const aEnd = new Date(aEndIso).getTime();
    const bStart = new Date(bStartIso).getTime();
    const bEnd = new Date(bEndIso).getTime();

    if ([aStart, aEnd, bStart, bEnd].some((x) => Number.isNaN(x))) return false;
    return aStart < bEnd && aEnd > bStart;
  }

  // =========================
  // ✅ BLOQUEAR DÍA COMPLETO (helper listo para usar)
  // =========================
  async blockAllDay(dateIso: string, reason?: string) {
    // start/end en hora local, y luego ISO
    const startIso = this.combineDateTimeISO(dateIso, '00:00');
    const endIso = this.addMinutesISO(startIso, 24 * 60);

    const { error } = await this.apptRepo.createBlockedSlotAllDay(startIso, endIso, reason ?? 'Bloqueo día completo');
    if (error) {
      this.toast.error('Error', error.message ?? 'No se pudo bloquear el día');
      return;
    }

    // refresca cache de bloqueos del día
    this.blocksByDate.delete(dateIso);
    await this.ensureBlocksLoaded(dateIso);

    // refresca combos si están en ese día
    if (this.isCreateModalOpen && this.formDate === dateIso) await this.refreshCreateHourOptions(dateIso);
    if (this.isRescheduleModalOpen && this.rescheduleDate === dateIso) await this.refreshRescheduleHourOptions(dateIso);

    this.toast.success('Bloqueado', `Se bloqueó todo el día ${this.formatDateES(dateIso)}`);
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

    if (this.isPatientDropdownOpen) {
      this.isPatientDropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isConfirmDeleteOpen) this.closeConfirmDelete();

    if (this.isPatientDropdownOpen) {
      this.isPatientDropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // MAPPING
  // =========================
  private toVM(r: any): AppointmentVM {
    const patient = r.patient ?? r.patients ?? null;

    const patientName = patient
      ? `${patient.first_names ?? ''} ${patient.last_names ?? ''}`.trim()
      : '(Sin paciente)';

    const dni = patient?.dni ? String(patient.dni) : '—';
    const phone = patient?.phone ?? '—';

    const { date, time } = this.splitDateTimeLocal(r.start_at);
    const durationMin = this.diffMinutes(r.start_at, r.end_at) ?? (this.slotMinutes ?? 30);

    return {
      id: r.id,
      patientId: r.patient_id,
      patientName: patientName || '(Sin paciente)',
      dni,
      phone,
      date,
      time,
      reason: r.reason ?? '—',
      status: (r.status ?? 'confirmed') as AppointmentStatus,
      notes: r.notes ?? '',
      _durationMin: durationMin,
    };
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

  private diffMinutes(aIso?: string, bIso?: string): number | null {
    if (!aIso || !bIso) return null;
    const a = new Date(aIso).getTime();
    const b = new Date(bIso).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return Math.max(1, Math.round((b - a) / 60000));
  }

  // ✅ genera ISO desde fecha/hora LOCAL (esto es lo correcto)
  private combineDateTimeISO(date: string, time: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);

    const local = new Date(y, (m - 1), d, hh, mm, 0);
    return local.toISOString();
  }

  private addMinutesISO(iso: string, minutes: number): string {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
  }

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
}
