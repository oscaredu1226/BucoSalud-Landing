import { Component, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastService } from '../../../../shared/toast/toast.service';

import {
  AppointmentHttpRepository,
  AppointmentRow,
  BlockedSlotRow,
  AvailabilitySettingsRow,
} from '../../../infrastructure/http/repositories/appointment.http-repository';

import { PatientHttpRepository, PatientRow } from '../../../infrastructure/http/repositories/patient.http-repository';

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

type WorkingHourDay = { start: string; end: string; enabled: boolean };
type WorkingHours = Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', WorkingHourDay>;

type SlotMeta = { blocked: boolean; reason?: string };

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
})
export class AgendaComponent implements OnInit {
  constructor(
    private readonly apptRepo: AppointmentHttpRepository,
    private readonly patientsRepo: PatientHttpRepository,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  isLoading = false;
  hasError = false;

  viewMode: 'day' | 'week' = 'day';

  weekStartISO: string = this.startOfWeekISO(this.todayISO());
  days: DayItem[] = this.buildWeekFromWeekStart(this.weekStartISO);
  selectedDate: string = this.todayISO();

  // slots dinámicos (según horarios + bloqueos)
  timeSlots: string[] = [];

  // estado amigable para UI
  isSelectedDayDisabled = false;
  selectedDayMessage = '';

  appointments: AgendaAppointment[] = [];

  // caches
  private apptsByDate = new Map<string, AgendaAppointment[]>();
  private slotMapForSelectedDate = new Map<string, AgendaAppointment>();

  // disponibilidad
  private availability: AvailabilitySettingsRow | null = null;
  private workingHours: WorkingHours | null = null;
  private slotMinutes = 30;

  // bloqueos
  private blocksByDate = new Map<string, BlockedSlotRow[]>();
  private slotMetaForSelectedDate = new Map<string, SlotMeta>();

  // =========================
  //  MODAL CREAR CITA (NUEVO)
  // =========================
  isCreateModalOpen = false;

  formPatientQuery = '';
  selectedPatient: PatientRow | null = null;
  patientResults: PatientRow[] = [];
  isPatientDropdownOpen = false;
  isPatientSearching = false;
  private patientSearchTimer: any = null;

  formDate: string = this.todayISO();
  formHour: string = '';
  formNotes = '';

  createHourOptions: string[] = [];

  async ngOnInit() {
    await this.ensureAvailabilityLoaded();
    await this.loadWeekAppointments();
    await this.refreshSelectedDayUI();
  }

  // =========================
  //  CARGA DE CITAS
  // =========================
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

  // =========================
  //  DISPONIBILIDAD + BLOQUEOS
  // =========================
  getSlotMeta(slot: string): SlotMeta {
    return this.slotMetaForSelectedDate.get(slot) ?? { blocked: false };
  }

  canCreateOnSlot(slot: string): boolean {
    if (this.isSelectedDayDisabled) return false;
    if (this.getAppointmentBySlot(slot)) return false;
    const meta = this.getSlotMeta(slot);
    if (meta.blocked) return false;
    return true;
  }

  isDayClosed(dateIso: string): boolean {
    if (!this.isDayEnabled(dateIso)) return true;

    const slots = this.getWorkingHoursSlotsForDate(dateIso);
    if (slots.length === 0) return true;

    const blocks = this.blocksByDate.get(dateIso);
    if (!blocks) return false;

    const duration = this.slotMinutes ?? 30;
    const allBlocked = slots.every((hhmm) => {
      const s = this.combineDateTimeISO(dateIso, hhmm);
      const e = this.addMinutesISO(s, duration);
      return blocks.some((b) => this.overlaps(s, e, b.start_at, b.end_at));
    });

    return allBlocked;
  }

  private async refreshSelectedDayUI() {
    await this.ensureAvailabilityLoaded();

    this.isSelectedDayDisabled = false;
    this.selectedDayMessage = '';
    this.slotMetaForSelectedDate.clear();

    if (!this.selectedDate) {
      this.timeSlots = this.buildTimeSlots(8, 18);
      this.cdr.detectChanges();
      return;
    }

    if (!this.isDayEnabled(this.selectedDate)) {
      this.timeSlots = [];
      this.isSelectedDayDisabled = true;

      const d = new Date(this.selectedDate + 'T00:00:00');
      const label = d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' });
      this.selectedDayMessage = `El ${label} no atendemos. Elige otro día y te mostramos los horarios disponibles.`;

      this.cdr.detectChanges();
      return;
    }

    this.timeSlots = this.getWorkingHoursSlotsForDate(this.selectedDate);

    await this.ensureBlocksLoaded(this.selectedDate);

    const blocks = this.blocksByDate.get(this.selectedDate) ?? [];
    const duration = this.slotMinutes ?? 30;

    for (const hhmm of this.timeSlots) {
      const startIso = this.combineDateTimeISO(this.selectedDate, hhmm);
      const endIso = this.addMinutesISO(startIso, duration);

      const block = blocks.find((b) => this.overlaps(startIso, endIso, b.start_at, b.end_at));
      if (block) {
        this.slotMetaForSelectedDate.set(hhmm, { blocked: true, reason: (block as any)?.reason ?? '' });
      } else {
        this.slotMetaForSelectedDate.set(hhmm, { blocked: false });
      }
    }

    const allBlocked = this.timeSlots.length > 0 && this.timeSlots.every((s) => this.getSlotMeta(s).blocked);
    if (allBlocked) {
      this.isSelectedDayDisabled = true;

      const d = new Date(this.selectedDate + 'T00:00:00');
      const label = d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' });
      const firstReason = this.timeSlots.map(s => this.getSlotMeta(s).reason).find(Boolean) || '';
      this.selectedDayMessage =
        `El ${label} no atendemos porque el día está bloqueado.` +
        (firstReason ? ` Motivo: ${firstReason}` : '') +
        ` Puedes elegir otra fecha para ver disponibilidad.`;
    }

    this.rebuildSlotMapForSelectedDate();
    this.cdr.detectChanges();
  }

  private async ensureBlocksLoaded(dateIso: string) {
    if (this.blocksByDate.has(dateIso)) return;

    const fromIso = this.combineDateTimeISO(dateIso, '00:00');
    const toIso = this.addMinutesISO(fromIso, 24 * 60);

    const { data, error } = await this.apptRepo.listBlockedSlotsByDayRange(fromIso, toIso, 500);

    if (error) {
      this.blocksByDate.set(dateIso, []);
      return;
    }

    this.blocksByDate.set(dateIso, (data ?? []) as BlockedSlotRow[]);
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
  //  UI NAVEGACIÓN
  // =========================
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
      await this.refreshSelectedDayUI();
      return;
    }

    await this.refreshSelectedDayUI();
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
    await this.refreshSelectedDayUI();
  }

  private async setWeek(weekStartISO: string) {
    this.weekStartISO = weekStartISO;
    this.days = this.buildWeekFromWeekStart(this.weekStartISO);

    const inWeek = this.days.some(x => x.date === this.selectedDate);
    if (!inWeek) this.selectedDate = this.days[0]?.date ?? this.weekStartISO;

    await this.loadWeekAppointments();
    await this.refreshSelectedDayUI();
  }

  // =========================
  //  MODAL: ABRIR / CERRAR / CREAR
  // =========================
  async openCreateModalFromSlot(slot: string) {
    if (!this.canCreateOnSlot(slot)) return;

    this.isCreateModalOpen = true;

    this.formPatientQuery = '';
    this.selectedPatient = null;
    this.patientResults = [];
    this.isPatientDropdownOpen = false;
    this.isPatientSearching = false;

    this.formDate = this.selectedDate;
    this.formHour = slot;
    this.formNotes = '';

    await this.refreshCreateHourOptions(this.formDate);

    if (this.formHour && !this.createHourOptions.includes(this.formHour)) {
      this.formHour = this.createHourOptions[0] || '';
    }

    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.isPatientDropdownOpen = false;
    this.patientResults = [];
    this.cdr.detectChanges();
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
    if (!this.formDate || !this.formHour) {
      this.toast.error('Campos incompletos', 'Selecciona fecha y hora');
      return;
    }

    await this.ensureAvailabilityLoaded();

    if (!this.isDayEnabled(this.formDate)) {
      this.toast.error('Día no disponible', 'Ese día está deshabilitado en disponibilidad');
      return;
    }

    await this.ensureBlocksLoaded(this.formDate);

    const duration = this.slotMinutes ?? 30;
    const startAtIso = this.combineDateTimeISO(this.formDate, this.formHour);
    const endAtIso = this.addMinutesISO(startAtIso, duration);

    // validar bloqueo en rango
    const dayBlocks = this.blocksByDate.get(this.formDate) ?? [];
    const blocked = dayBlocks.some((b) => this.overlaps(startAtIso, endAtIso, b.start_at, b.end_at));
    if (blocked) {
      this.toast.error('Horario bloqueado', 'Ese horario no está disponible');
      return;
    }

    // validar ocupado (con citas ya cargadas)
    const busy = (this.apptsByDate.get(this.formDate) ?? [])
      .filter((a) => a.status !== 'Cancelada')
      .some((a) => {
        const aStart = this.combineDateTimeISO(a.date, a.time);
        const aEnd = this.addMinutesISO(aStart, duration);
        return this.overlaps(startAtIso, endAtIso, aStart, aEnd);
      });

    if (busy) {
      this.toast.error('Horario ocupado', 'Ya existe una cita en ese horario');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    const { data, error } = await this.apptRepo.create({
      patient_id: this.selectedPatient.id,
      start_at: startAtIso,
      end_at: endAtIso,
      status: 'confirmed',
      notes: this.formNotes?.trim() || null,
    } as any);

    this.isLoading = false;

    if (error || !data) {
      this.toast.error('Error', (error as any)?.message ?? 'No se pudo crear la cita');
      this.cdr.detectChanges();
      return;
    }

    // refrescar semana para mantener consistente (bloqueos + status + cache)
    await this.loadWeekAppointments();
    await this.refreshSelectedDayUI();

    this.closeCreateModal();
    this.toast.success('Cita creada', `Se agendó ${this.formatDateES(this.formDate)} ${this.formHour}`);
  }

  private async refreshCreateHourOptions(dateIso: string) {
    await this.ensureAvailabilityLoaded();

    if (!dateIso) {
      this.createHourOptions = [];
      return;
    }

    if (!this.isDayEnabled(dateIso)) {
      this.createHourOptions = [];
      return;
    }

    const baseHours = this.getWorkingHoursSlotsForDate(dateIso);
    await this.ensureBlocksLoaded(dateIso);

    const duration = this.slotMinutes ?? 30;
    const blocks = this.blocksByDate.get(dateIso) ?? [];
    const appts = this.apptsByDate.get(dateIso) ?? [];

    this.createHourOptions = baseHours.filter((hhmm) => {
      const startIso = this.combineDateTimeISO(dateIso, hhmm);
      const endIso = this.addMinutesISO(startIso, duration);

      const isBlocked = blocks.some((b) => this.overlaps(startIso, endIso, b.start_at, b.end_at));
      if (isBlocked) return false;

      const isBusy = appts
        .filter((a) => a.status !== 'Cancelada')
        .some((a) => {
          const aStart = this.combineDateTimeISO(a.date, a.time);
          const aEnd = this.addMinutesISO(aStart, duration);
          return this.overlaps(startIso, endIso, aStart, aEnd);
        });

      return !isBusy;
    });
  }

  // =========================
  //  MODAL: BUSCAR PACIENTE (igual que appointments)
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
        this.toast.error('Error', (error as any)?.message ?? 'No se pudo buscar el paciente');
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

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const insidePopover = !!target.closest('[data-popover]');
    if (insidePopover) return;

    if (this.isPatientDropdownOpen) {
      this.isPatientDropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isCreateModalOpen) this.closeCreateModal();

    if (this.isPatientDropdownOpen) {
      this.isPatientDropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  //  DISPONIBILIDAD
  // =========================
  private async ensureAvailabilityLoaded() {
    if (this.availability) return;

    const { data, error } = await this.apptRepo.getAvailabilitySettings();
    if (error) {
      this.availability = null;
      this.workingHours = null;
      this.slotMinutes = 30;
      return;
    }

    this.availability = data ?? null;
    this.workingHours = (data?.working_hours ?? null) as WorkingHours | null;
    this.slotMinutes = Number((data as any)?.slot_minutes ?? 30);
  }

  private dowKeyFromDate(dateIso: string): keyof WorkingHours {
    const d = new Date(dateIso + 'T00:00:00');
    const dow = d.getDay();
    const map: (keyof WorkingHours)[] = ['sun','mon','tue','wed','thu','fri','sat'];
    return map[dow];
  }

  private isDayEnabled(dateIso: string): boolean {
    if (!this.workingHours) return true;
    const key = this.dowKeyFromDate(dateIso);
    return !!this.workingHours[key]?.enabled;
  }

  private parseHHmm(hhmm: string): { hh: number; mm: number } | null {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const [hh, mm] = hhmm.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hh, mm };
  }

  private getWorkingHoursSlotsForDate(dateIso: string): string[] {
    if (!this.workingHours) return this.buildTimeSlots(8, 18);

    const key = this.dowKeyFromDate(dateIso);
    const day = this.workingHours[key];

    if (!day || !day.enabled) return [];

    const start = this.parseHHmm(day.start);
    const end = this.parseHHmm(day.end);
    if (!start || !end) return this.buildTimeSlots(8, 18);

    const step = this.slotMinutes ?? 30;

    const [y, m, d] = dateIso.split('-').map(Number);
    const startLocal = new Date(y, m - 1, d, start.hh, start.mm, 0, 0);
    const endBoundary = new Date(y, m - 1, d, end.hh, end.mm, 0, 0);

    const out: string[] = [];
    for (let cur = new Date(startLocal); ; cur = new Date(cur.getTime() + step * 60_000)) {
      const slotStart = new Date(cur);
      const slotEnd = new Date(slotStart.getTime() + step * 60_000);
      if (slotEnd.getTime() > endBoundary.getTime()) break;

      out.push(
        `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`
      );
    }

    return out;
  }

  // =========================
  //  VM + FECHAS
  // =========================
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

  protected formatDateES(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const y = iso.slice(0, 4);
    const m = iso.slice(5, 7);
    const d = iso.slice(8, 10);
    return `${d}/${m}/${y}`;
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
