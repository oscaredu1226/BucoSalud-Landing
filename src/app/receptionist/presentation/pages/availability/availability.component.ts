import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  // UI state (mock)
  isSaving = false;

  // Duración de citas
  slotSize: SlotSize = 30;
  slotOptions: SlotSize[] = [15, 30, 45, 60];

  // Horarios por día (como tu imagen: 08:00 - 18:00, viernes 08:00 - 14:00, domingo/sábado off)
  days: DayAvailability[] = [
    { key: 'sun', label: 'Domingo', enabled: false, start: '08:00', end: '18:00' },
    { key: 'mon', label: 'Lunes', enabled: true, start: '08:00', end: '18:00' },
    { key: 'tue', label: 'Martes', enabled: true, start: '08:00', end: '18:00' },
    { key: 'wed', label: 'Miércoles', enabled: true, start: '08:00', end: '18:00' },
    { key: 'thu', label: 'Jueves', enabled: true, start: '08:00', end: '18:00' },
    { key: 'fri', label: 'Viernes', enabled: true, start: '08:00', end: '14:00' },
    { key: 'sat', label: 'Sábado', enabled: false, start: '08:00', end: '14:00' },
  ];

  // Opciones hora para selects (cada 30 min por defecto; se recalcula según slotSize)
  hourOptions: string[] = this.buildTimeOptions(30);

  // Bloqueos (tabla)
  blocks: BlockRow[] = [
    { id: '1', date: '2025-01-25', start: '13:00', end: '14:00', reason: 'Almuerzo con proveedor' },
  ];

  // Modal Agregar Bloqueo
  isBlockModalOpen = false;
  blockDraftDate = '';
  blockDraftStart = '13:00';
  blockDraftEnd = '14:00';
  blockDraftReason = '';

  constructor() {
    this.syncHourOptions();
  }

  // =========================
  // Horario de atención
  // =========================
  toggleDay(d: DayAvailability) {
    d.enabled = !d.enabled;
  }

  onSlotSizeChange() {
    this.syncHourOptions();

    // opcional: si quieres ajustar start/end a un valor válido cercano, lo dejamos simple:
    // si no existe exactamente, no rompemos (porque es maqueta).
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
    if (!this.blockDraftDate || !this.blockDraftStart || !this.blockDraftEnd) return;

    const newRow: BlockRow = {
      id: crypto?.randomUUID?.() ?? String(Date.now()),
      date: this.blockDraftDate,
      start: this.blockDraftStart,
      end: this.blockDraftEnd,
      reason: this.blockDraftReason.trim() || 'Bloqueo',
    };

    this.blocks = [newRow, ...this.blocks];
    this.closeBlockModal();
  }

  removeBlock(id: string) {
    this.blocks = this.blocks.filter((b) => b.id !== id);
  }

  // =========================
  // Save (mock)
  // =========================
  async save() {
    this.isSaving = true;
    await new Promise((r) => setTimeout(r, 700));
    this.isSaving = false;
  }

  // =========================
  // Helpers UI
  // =========================
  formatDateESLong(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const dt = new Date(iso + 'T00:00:00');
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

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
}
