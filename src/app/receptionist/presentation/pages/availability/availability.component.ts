import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../shared/toast/toast.service';
import {
  AvailabilityHttpRepository,
  DayKey,
  WorkingHours
} from '../../../infrastructure/http/repositories/availability.http-repository';
import {AvailabilityStore} from '../../../../shared/availability/availability.store';

type DayAvailability = {
  key: DayKey;
  label: string;
  enabled: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
};

type BlockRow = {
  id: string;
  date: string;   // "YYYY-MM-DD"
  start: string;  // "HH:mm"
  end: string;    // "HH:mm"
  reason: string;
  isAllDay: boolean; // ✅ nuevo (solo UI)
};

type SlotSize = 15 | 30 | 45 | 60;

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availability.component.html',
})
export class AvailabilityComponent implements OnInit {
  constructor(
    private readonly toast: ToastService,
    private readonly availabilityRepo: AvailabilityHttpRepository,
    private readonly cdr: ChangeDetectorRef,
    private readonly availabilityStore: AvailabilityStore

  ) {
    this.syncHourOptions();
  }

  // UI state
  isSaving = false;
  isLoading = false;
  hasError = false;

  // ✅ Settings row cache
  private settingsId: string | null = null;
  private timezone: string | null = null;

  // Duración de citas
  slotSize: SlotSize = 30;
  slotOptions: SlotSize[] = [15, 30, 45, 60];

  // Horarios por día
  days: DayAvailability[] = [
    { key: 'sun', label: 'Domingo', enabled: false, start: '08:00', end: '18:00' },
    { key: 'mon', label: 'Lunes', enabled: true, start: '08:00', end: '18:00' },
    { key: 'tue', label: 'Martes', enabled: true, start: '08:00', end: '18:00' },
    { key: 'wed', label: 'Miércoles', enabled: true, start: '08:00', end: '18:00' },
    { key: 'thu', label: 'Jueves', enabled: true, start: '08:00', end: '18:00' },
    { key: 'fri', label: 'Viernes', enabled: true, start: '08:00', end: '14:00' },
    { key: 'sat', label: 'Sábado', enabled: false, start: '08:00', end: '14:00' },
  ];

  // Opciones hora para selects
  hourOptions: string[] = [];

  // Bloqueos (se cargan desde supabase)
  blocks: BlockRow[] = [];

  // Modal Agregar Bloqueo
  isBlockModalOpen = false;
  blockDraftDate = '';
  blockDraftStart = '13:00';
  blockDraftEnd = '14:00';
  blockDraftReason = '';

  // ✅ NUEVO: bloquear día completo
  blockDraftAllDay = false;

  // ✅ Modal confirmación eliminar bloqueo
  isConfirmDeleteOpen = false;
  pendingDelete: BlockRow | null = null;
  confirmTitle = 'Eliminar bloqueo';
  confirmMessage = '¿Seguro que deseas eliminar este bloqueo?';

  // =========================
  // INIT
  // =========================
  async ngOnInit() {
    await this.loadAll();
  }

  private async loadAll() {
    try {
      this.isLoading = true;
      this.hasError = false;
      this.cdr.detectChanges();

      const [settingsRes, blocksRes] = await Promise.all([
        this.availabilityRepo.getSettings(),
        this.availabilityRepo.listBlockedSlots(500),
      ]);

      const settingsErr = (settingsRes as any)?.error;
      const blocksErr = (blocksRes as any)?.error;

      if (settingsErr) {
        this.hasError = true;
        this.toast.error('Error', settingsErr.message ?? 'No se pudo cargar availability_settings');
        this.cdr.detectChanges();
        return;
      }
      if (blocksErr) {
        this.hasError = true;
        this.toast.error('Error', blocksErr.message ?? 'No se pudo cargar blocked_slots');
        this.cdr.detectChanges();
        return;
      }

      const settings = (settingsRes as any)?.data ?? null;

      // ✅ settings
      if (settings) {
        this.settingsId = settings.id ?? null;
        this.timezone = settings.timezone ?? null;

        const slot = Number(settings.slot_minutes ?? 30);
        if (this.slotOptions.includes(slot as any)) {
          this.slotSize = slot as SlotSize;
        } else {
          this.slotSize = 30;
        }

        this.syncHourOptions();

        const wh = this.normalizeWorkingHours(settings.working_hours);
        if (wh) {
          this.days = this.days.map((d) => {
            const row = wh[d.key];
            if (!row) return d;
            return {
              ...d,
              enabled: !!row.enabled,
              start: row.start ?? d.start,
              end: row.end ?? d.end,
            };
          });
        }
      } else {
        this.settingsId = null;
        this.timezone = null;
        this.slotSize = 30;
        this.syncHourOptions();
      }

      // ✅ blocks
      const dbBlocks = (blocksRes as any)?.data ?? [];
      this.blocks = dbBlocks.map((b: any) => {
        const { date, time } = this.splitDateTimeLocal(b.start_at);
        const { date: endDate, time: endTime } = this.splitDateTimeLocal(b.end_at);

        // ✅ Detectar "todo el día": 00:00 -> 00:00 del día siguiente
        const isAllDay =
          time === '00:00' &&
          endTime === '00:00' &&
          this.isNextDay(date, endDate);

        return {
          id: b.id,
          date,
          start: time,
          end: endTime,
          reason: b.reason ?? 'Bloqueo',
          isAllDay,
        };
      });

      this.cdr.detectChanges();
    } catch (e: any) {
      this.hasError = true;
      this.toast.error('Error', e?.message ?? 'No se pudo cargar la disponibilidad');
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // Horario de atención
  // =========================
  toggleDay(d: DayAvailability) {
    d.enabled = !d.enabled;
    this.toast.info('Horario', `${d.label}: ${d.enabled ? 'Activado' : 'Desactivado'}`);
    this.cdr.detectChanges();
  }

  onSlotSizeChange() {
    this.syncHourOptions();
    this.toast.info('Duración', `Intervalos configurados a ${this.slotSize} minutos`);
    this.cdr.detectChanges();
  }

  private syncHourOptions() {
    this.hourOptions = this.buildTimeOptions(this.slotSize);
  }

  // =========================
  // Bloqueos
  // =========================
  openBlockModal() {
    this.isBlockModalOpen = true;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.blockDraftDate = `${y}-${m}-${d}`;

    this.blockDraftAllDay = false;
    this.blockDraftStart = '13:00';
    this.blockDraftEnd = '14:00';
    this.blockDraftReason = '';
    this.cdr.detectChanges();
  }

  closeBlockModal() {
    this.isBlockModalOpen = false;
    this.cdr.detectChanges();
  }

  onToggleAllDay() {
    this.blockDraftAllDay = !this.blockDraftAllDay;

    // si activas todo el día, forzamos un rango "completo" en UI (solo visual)
    if (this.blockDraftAllDay) {
      this.blockDraftStart = '00:00';
      this.blockDraftEnd = '23:59';
    } else {
      this.blockDraftStart = '13:00';
      this.blockDraftEnd = '14:00';
    }

    this.cdr.detectChanges();
  }

  async addBlock() {
    if (!this.blockDraftDate) {
      this.toast.error('Campos incompletos', 'Selecciona una fecha para el bloqueo');
      return;
    }

    // ✅ Si no es todo el día, validamos horas normal
    if (!this.blockDraftAllDay) {
      if (!this.blockDraftStart || !this.blockDraftEnd) {
        this.toast.error('Campos incompletos', 'Selecciona hora de inicio y fin');
        return;
      }
      if (this.toMinutes(this.blockDraftEnd) <= this.toMinutes(this.blockDraftStart)) {
        this.toast.error('Horario inválido', 'La hora fin debe ser mayor que la hora inicio');
        return;
      }
    }

    // ✅ RANGO FINAL A GUARDAR
    let startAtIso = '';
    let endAtIso = '';

    if (this.blockDraftAllDay) {
      // día completo: 00:00 -> 00:00 del día siguiente (EN HORA LOCAL)
      startAtIso = this.combineDateTimeISO(this.blockDraftDate, '00:00');
      endAtIso = this.addDaysISO(startAtIso, 1);
    } else {
      startAtIso = this.combineDateTimeISO(this.blockDraftDate, this.blockDraftStart);
      endAtIso = this.combineDateTimeISO(this.blockDraftDate, this.blockDraftEnd);
    }

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const { data, error } = await this.availabilityRepo.createBlockedSlot({
        start_at: startAtIso,
        end_at: endAtIso,
        reason: this.blockDraftReason.trim() || (this.blockDraftAllDay ? 'Bloqueo día completo' : 'Bloqueo'),
      });

      if (error) {
        this.toast.error('Error', error.message ?? 'No se pudo crear el bloqueo');
        this.cdr.detectChanges();
        return;
      }

      const newRow: BlockRow = {
        id: (data as any).id,
        date: this.blockDraftDate,
        start: this.blockDraftAllDay ? '00:00' : this.blockDraftStart,
        end: this.blockDraftAllDay ? '00:00' : this.blockDraftEnd, // ✅ en tabla mostramos 00:00 para all-day
        reason: (data as any).reason ?? (this.blockDraftAllDay ? 'Bloqueo día completo' : 'Bloqueo'),
        isAllDay: this.blockDraftAllDay,
      };

      this.blocks = [newRow, ...this.blocks];
      this.closeBlockModal();

      this.toast.success(
        'Bloqueo agregado',
        newRow.isAllDay
          ? `${this.formatDateESLong(newRow.date)} · Todo el día`
          : `${this.formatDateESLong(newRow.date)} · ${newRow.start}–${newRow.end}`
      );

      this.cdr.detectChanges();
    } catch (e: any) {
      this.toast.error('Error', e?.message ?? 'No se pudo crear el bloqueo');
      this.cdr.detectChanges();
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  requestRemoveBlock(b: BlockRow) {
    this.pendingDelete = b;
    this.confirmTitle = 'Eliminar bloqueo';
    this.confirmMessage = b.isAllDay
      ? `¿Seguro que deseas eliminar el bloqueo de TODO EL DÍA del ${this.formatDateESLong(b.date)}?`
      : `¿Seguro que deseas eliminar el bloqueo del ${this.formatDateESLong(b.date)} (${b.start}–${b.end})?`;
    this.isConfirmDeleteOpen = true;
    this.cdr.detectChanges();
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen = false;
    this.pendingDelete = null;
    this.cdr.detectChanges();
  }

  async confirmRemoveBlock() {
    const b = this.pendingDelete;
    if (!b) return;

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const { error } = await this.availabilityRepo.removeBlockedSlot(b.id);
      if (error) {
        this.toast.error('Error', error.message ?? 'No se pudo eliminar el bloqueo');
        this.cdr.detectChanges();
        return;
      }

      this.blocks = this.blocks.filter((x) => x.id !== b.id);
      this.closeConfirmDelete();
      this.toast.success('Bloqueo eliminado', `${this.formatDateESLong(b.date)}`);
      this.cdr.detectChanges();
    } catch (e: any) {
      this.toast.error('Error', e?.message ?? 'No se pudo eliminar el bloqueo');
      this.cdr.detectChanges();
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // SAVE (REAL)
  // =========================
  async save() {
    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const working_hours: WorkingHours = {
        sun: this.dayToJson('sun'),
        mon: this.dayToJson('mon'),
        tue: this.dayToJson('tue'),
        wed: this.dayToJson('wed'),
        thu: this.dayToJson('thu'),
        fri: this.dayToJson('fri'),
        sat: this.dayToJson('sat'),
      };

      const timezoneToSave = this.timezone ?? null;

      const { data, error } = await this.availabilityRepo.upsertSettings({
        id: this.settingsId ?? undefined,
        timezone: timezoneToSave,
        slot_minutes: this.slotSize,
        working_hours,
      });

      if (error) {
        this.toast.error('Error', error.message ?? 'No se pudo guardar disponibilidad');
        this.cdr.detectChanges();
        return;
      }

      this.settingsId = (data as any)?.id ?? this.settingsId;
      this.timezone = (data as any)?.timezone ?? this.timezone;

      this.toast.success('Guardado', 'Disponibilidad actualizada correctamente');
      this.cdr.detectChanges();
    } catch (e: any) {
      this.toast.error('Error', e?.message ?? 'No se pudo guardar, intenta nuevamente');
      this.cdr.detectChanges();
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
    await this.availabilityStore.refresh();

  }

  private dayToJson(key: DayKey) {
    const d = this.days.find((x) => x.key === key);
    return {
      enabled: !!d?.enabled,
      start: d?.start ?? '08:00',
      end: d?.end ?? '18:00',
    };
  }

  // =========================
  // Helpers UI
  // =========================
  formatDateESLong(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const dt = new Date(iso + 'T00:00:00');
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const dayName = days[dt.getDay()];
    const day = dt.getDate();
    const monthName = months[dt.getMonth()];
    const year = dt.getFullYear();
    return `${dayName}, ${day} de ${monthName} ${year}`;
  }

  trackByKey = (_: number, d: DayAvailability) => d.key;
  trackById = (_: number, x: BlockRow) => x.id;

  private buildTimeOptions(stepMinutes: number): string[] {
    const out: string[] = [];
    for (let h = 0; h <= 23; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        out.push(`${hh}:${mm}`);
      }
    }
    return out;
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h * 60) + (m || 0);
  }

  private combineDateTimeISO(date: string, time: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const local = new Date(y, (m - 1), d, hh, mm, 0);
    return local.toISOString();
  }

  private addDaysISO(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  private splitDateTimeLocal(iso: string): { date: string; time: string } {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) {
      const now = new Date();
      return { date: this.toISODate(now), time: '00:00' };
    }

    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');

    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isNextDay(a: string, b: string): boolean {
    // b == a + 1 día
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    const diff = (db.getTime() - da.getTime()) / 86400000;
    return Math.round(diff) === 1;
  }

  private normalizeWorkingHours(raw: any): WorkingHours | null {
    if (!raw || typeof raw !== 'object') return null;

    const keys: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const out: any = {};

    for (const k of keys) {
      const v = raw?.[k];
      if (!v || typeof v !== 'object') continue;

      const enabled =
        typeof v.enabled === 'boolean' ? v.enabled :
          typeof v.is_enabled === 'boolean' ? v.is_enabled :
            false;

      const start =
        typeof v.start === 'string' ? v.start :
          typeof v.start_time === 'string' ? v.start_time :
            '08:00';

      const end =
        typeof v.end === 'string' ? v.end :
          typeof v.end_time === 'string' ? v.end_time :
            '18:00';

      out[k] = { enabled, start, end };
    }

    if (!Object.keys(out).length) return null;

    for (const k of keys) {
      if (!out[k]) out[k] = { enabled: false, start: '08:00', end: '18:00' };
    }

    return out as WorkingHours;
  }

  // ✅ ESC cierra confirmación
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isConfirmDeleteOpen) this.closeConfirmDelete();
  }
}
