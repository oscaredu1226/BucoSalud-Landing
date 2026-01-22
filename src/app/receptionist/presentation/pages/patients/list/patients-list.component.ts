import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type PatientStatus = 'active' | 'inactive';

type PatientRowVM = {
  id: string;
  fullName: string;
  dni: string;
  phone?: string;
  email?: string;
  lastVisit?: string; // ISO date (YYYY-MM-DD o ISO full)
  status: PatientStatus;
};

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-list.component.html',
})
export class PatientsListComponent {
  // search
  query = '';

  // dropdown por fila
  openRowMenuId: string | null = null;

  // modales
  isCreateModalOpen = false;
  isDetailModalOpen = false;
  isEditModalOpen = false;

  // seleccionado
  selected: PatientRowVM | null = null;

  // forms (mock)
  formFullName = '';
  formDni = '';
  formPhone = '';
  formEmail = '';

  editFullName = '';
  editDni = '';
  editPhone = '';
  editEmail = '';

  // data mock
  patients: PatientRowVM[] = [
    {
      id: 'PAT-1001',
      fullName: 'María López García',
      dni: '12345678',
      phone: '987654321',
      email: 'maria@example.com',
      lastVisit: '2025-01-09',
      status: 'active',
    },
    {
      id: 'PAT-1002',
      fullName: 'Carlos Mendoza Ruiz',
      dni: '23456789',
      phone: '912345678',
      lastVisit: '2025-01-17',
      status: 'active',
    },
    {
      id: 'PAT-1003',
      fullName: 'Ana Fernández Torres',
      dni: '34567890',
      email: 'ana@example.com',
      status: 'inactive',
    },
    {
      id: 'PAT-1004',
      fullName: 'Roberto Sánchez Vega',
      dni: '45678901',
      phone: '923456789',
      email: 'roberto@example.com',
      lastVisit: '2025-01-14',
      status: 'active',
    },
    {
      id: 'PAT-1005',
      fullName: 'Elena Morales Díaz',
      dni: '56789012',
      status: 'inactive',
    },
  ];

  // =========================
  // Computed
  // =========================
  get filtered(): PatientRowVM[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.patients;

    return this.patients.filter((p) =>
      [p.fullName, p.dni, p.phone ?? '', p.email ?? '', p.id]
        .some((x) => x.toLowerCase().includes(q))
    );
  }

  trackById = (_: number, p: PatientRowVM) => p.id;

  // =========================
  // UI helpers
  // =========================
  formatLastVisit(iso?: string): string {
    if (!iso) return 'Sin citas';

    // acepta 'YYYY-MM-DD' o ISO con hora
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
    if (Number.isNaN(d.getTime())) return 'Sin citas';

    const day = d.getDate();
    const month = d.getMonth(); // 0..11
    const year = d.getFullYear();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${day} ${months[month]} ${year}`;
  }

  // =========================
  // Row menu
  // =========================
  toggleRowMenu(rowId: string) {
    this.openRowMenuId = this.openRowMenuId === rowId ? null : rowId;
  }

  closeRowMenu() {
    this.openRowMenuId = null;
  }

  // =========================
  // Modals: Create
  // =========================
  openCreateModal() {
    this.closeRowMenu();
    this.isCreateModalOpen = true;

    this.formFullName = '';
    this.formDni = '';
    this.formPhone = '';
    this.formEmail = '';
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  createPatient() {
    if (!this.formFullName.trim() || !this.formDni.trim()) return;

    const nextId = this.nextId();

    const newPatient: PatientRowVM = {
      id: nextId,
      fullName: this.formFullName.trim(),
      dni: this.formDni.trim(),
      phone: this.formPhone.trim() || undefined,
      email: this.formEmail.trim() || undefined,
      status: 'active',
      lastVisit: undefined,
    };

    this.patients = [newPatient, ...this.patients];
    this.closeCreateModal();
  }

  // =========================
  // Modals: Details
  // =========================
  openDetailModal(p: PatientRowVM) {
    this.closeRowMenu();
    this.selected = p;
    this.isDetailModalOpen = true;
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.selected = null;
  }

  // =========================
  // Modals: Edit
  // =========================
  openEditModal(p: PatientRowVM) {
    this.closeRowMenu();
    this.selected = p;

    this.editFullName = p.fullName;
    this.editDni = p.dni;
    this.editPhone = p.phone ?? '';
    this.editEmail = p.email ?? '';

    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selected = null;
  }

  saveEdit() {
    if (!this.selected) return;
    if (!this.editFullName.trim() || !this.editDni.trim()) return;

    const id = this.selected.id;

    const updated: PatientRowVM = {
      ...this.selected,
      fullName: this.editFullName.trim(),
      dni: this.editDni.trim(),
      phone: this.editPhone.trim() || undefined,
      email: this.editEmail.trim() || undefined,
    };

    this.patients = this.patients.map((x) => (x.id === id ? updated : x));
    this.closeEditModal();
  }

  // =========================
  // Delete
  // =========================
  deleteRow(p: PatientRowVM) {
    this.closeRowMenu();
    this.patients = this.patients.filter((x) => x.id !== p.id);

    if (this.selected?.id === p.id) {
      this.closeDetailModal();
      this.closeEditModal();
    }
  }

  // =========================
  // Click outside close (solo dropdown)
  // =========================
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const insidePopover = !!target.closest('[data-popover]');
    if (insidePopover) return;

    this.closeRowMenu();
  }

  // =========================
  // utils
  // =========================
  private nextId(): string {
    let max = 1000;
    for (const r of this.patients) {
      const n = Number(r.id.replace('PAT-', ''));
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
    return `PAT-${max + 1}`;
  }
}
