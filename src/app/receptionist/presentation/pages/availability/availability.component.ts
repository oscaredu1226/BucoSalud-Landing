import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ToastService} from '../../../../shared/toast/toast.service';

type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

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
};

type SlotSize = 15 | 30 | 45 | 60;

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availability.component.html',
})
export class AvailabilityComponent {
  constructor(private readonly toast: ToastService) {
    this.syncHourOptions();
  }

  // UI state (mock)
  isSaving = false;

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

  // Bloqueos
  blocks: BlockRow[] = [
    { id: '1', date: '2025-01-25', start: '13:00', end: '14:00', reason: 'Almuerzo con proveedor' },
  ];

  // Modal Agregar Bloqueo
  isBlockModalOpen = false;
  blockDraftDate = '';
  blockDraftStart = '13:00';
  blockDraftEnd = '14:00';
  blockDraftReason = '';

  // ✅ Modal confirmación eliminar bloqueo
  isConfirmDeleteOpen = false;
  pendingDelete: BlockRow | null = null;
  confirmTitle = 'Eliminar bloqueo';
  confirmMessage = '¿Seguro que deseas eliminar este bloqueo?';

  // =========================
  // Horario de atención
  // =========================
  toggleDay(d: DayAvailability) {
    d.enabled = !d.enabled;

    // info: no molesta, pero si no quieres, lo quitas
    this.toast.info('Horario', `${d.label}: ${d.enabled ? 'Activado' : 'Desactivado'}`);
  }

  onSlotSizeChange() {
    this.syncHourOptions();
    this.toast.info('Duración', `Intervalos configurados a ${this.slotSize} minutos`);
  }

  private syncHourOptions() {
    this.hourOptions = this.buildTimeOptions(this.slotSize);
  }

  // =========================
  // Bloqueos
  // =========================
  openBlockModal() {
    this.isBlockModalOpen = true;

    // default date = hoy
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.blockDraftDate = `${y}-${m}-${d}`;

    this.blockDraftStart = '13:00';
    this.blockDraftEnd = '14:00';
    this.blockDraftReason = '';
  }

  closeBlockModal() {
    this.isBlockModalOpen = false;
  }

  addBlock() {
    // badway: validación básica
    if (!this.blockDraftDate) {
      this.toast.error('Campos incompletos', 'Selecciona una fecha para el bloqueo');
      return;
    }
    if (!this.blockDraftStart || !this.blockDraftEnd) {
      this.toast.error('Campos incompletos', 'Selecciona hora de inicio y fin');
      return;
    }

    // badway: rango inválido
    if (this.toMinutes(this.blockDraftEnd) <= this.toMinutes(this.blockDraftStart)) {
      this.toast.error('Horario inválido', 'La hora fin debe ser mayor que la hora inicio');
      return;
    }

    const newRow: BlockRow = {
      id: crypto?.randomUUID?.() ?? String(Date.now()),
      date: this.blockDraftDate,
      start: this.blockDraftStart,
      end: this.blockDraftEnd,
      reason: this.blockDraftReason.trim() || 'Bloqueo',
    };

    this.blocks = [newRow, ...this.blocks];
    this.closeBlockModal();

    // goodway
    this.toast.success('Bloqueo agregado', `${this.formatDateESLong(newRow.date)} · ${newRow.start}–${newRow.end}`);
  }

  // ✅ pedir confirmación
  requestRemoveBlock(b: BlockRow) {
    this.pendingDelete = b;
    this.confirmTitle = 'Eliminar bloqueo';
    this.confirmMessage = `¿Seguro que deseas eliminar el bloqueo del ${this.formatDateESLong(b.date)} (${b.start}–${b.end})?`;
    this.isConfirmDeleteOpen = true;
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen = false;
    this.pendingDelete = null;
  }

  confirmRemoveBlock() {
    const b = this.pendingDelete;
    if (!b) return;

    this.blocks = this.blocks.filter((x) => x.id !== b.id);
    this.closeConfirmDelete();

    this.toast.success('Bloqueo eliminado', `${this.formatDateESLong(b.date)}`);
  }

  // (lo mantengo por compatibilidad si lo llamas en otro lado, pero ya no se usa desde el HTML)
  removeBlock(id: string) {
    const found = this.blocks.find((b) => b.id === id);
    this.blocks = this.blocks.filter((b) => b.id !== id);

    this.toast.success('Bloqueo eliminado', found ? `${this.formatDateESLong(found.date)}` : 'Se eliminó el bloqueo');
  }

  // =========================
  // Save (mock)
  // =========================
  async save() {
    try {
      this.isSaving = true;

      // mock delay
      await new Promise((r) => setTimeout(r, 700));

      // goodway
      this.toast.success('Guardado', 'Disponibilidad actualizada correctamente');
    } catch {
      // badway
      this.toast.error('Error', 'No se pudo guardar, intenta nuevamente');
    } finally {
      this.isSaving = false;
    }
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

  // ✅ ESC cierra confirmación
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isConfirmDeleteOpen) this.closeConfirmDelete();
  }
}
