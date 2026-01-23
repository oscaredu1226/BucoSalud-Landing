import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../shared/toast/toast.service';

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
  constructor(private readonly toast: ToastService) {}

  // search
  query = '';

  // dropdown por fila
  openRowMenuId: string | null = null;

  // modales
  isCreateModalOpen = false;
  isDetailModalOpen = false;
  isEditModalOpen = false;

  // ✅ Modal confirmación eliminar
  isConfirmDeleteOpen = false;
  confirmTitle = 'Eliminar paciente';
  confirmMessage = '¿Seguro que deseas eliminar este paciente?';
  pendingDelete: PatientRowVM | null = null;

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
  // Modales: Create
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
    const fullName = this.formFullName.trim();
    const dni = this.formDni.trim();
    const phone = this.formPhone.trim();
    const email = this.formEmail.trim();

    // ✅ BADWAY: validación
    if (!fullName) {
      this.toast.error('Campos incompletos', 'Ingresa el nombre completo');
      return;
    }
    if (!dni) {
      this.toast.error('Campos incompletos', 'Ingresa el DNI');
      return;
    }

    // ✅ BADWAY: DNI duplicado
    if (this.isDniTaken(dni)) {
      this.toast.error('DNI duplicado', 'Ya existe un paciente con ese DNI');
      return;
    }

    const nextId = this.nextId();

    const newPatient: PatientRowVM = {
      id: nextId,
      fullName,
      dni,
      phone: phone || undefined,
      email: email || undefined,
      status: 'active',
      lastVisit: undefined,
    };

    this.patients = [newPatient, ...this.patients];
    this.closeCreateModal();

    // ✅ GOODWAY
    this.toast.success('Paciente creado', `${newPatient.fullName} · DNI ${newPatient.dni}`);
  }

  // =========================
  // Modales: Details
  // =========================
  openDetailModal(p: PatientRowVM) {
    this.closeRowMenu();
    this.selected = p;
    this.isDetailModalOpen = true;

    this.toast.info('Detalles', `Abriendo ${p.id}`); // opcional
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.selected = null;
  }

  // =========================
  // Modales: Edit
  // =========================
  openEditModal(p: PatientRowVM) {
    this.closeRowMenu();
    this.selected = p;

    this.editFullName = p.fullName;
    this.editDni = p.dni;
    this.editPhone = p.phone ?? '';
    this.editEmail = p.email ?? '';

    // si estaba el modal de detalles, lo puedes dejar abierto o no; aquí lo dejamos tal cual.
    this.isEditModalOpen = true;

    this.toast.info('Editar', `Editando ${p.id}`); // opcional
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selected = null;
  }

  saveEdit() {
    if (!this.selected) {
      this.toast.error('Error', 'No se encontró el paciente a editar');
      return;
    }

    const fullName = this.editFullName.trim();
    const dni = this.editDni.trim();
    const phone = this.editPhone.trim();
    const email = this.editEmail.trim();

    // ✅ BADWAY: validación
    if (!fullName) {
      this.toast.error('Campos incompletos', 'El nombre no puede estar vacío');
      return;
    }
    if (!dni) {
      this.toast.error('Campos incompletos', 'El DNI no puede estar vacío');
      return;
    }

    // ✅ BADWAY: DNI duplicado (solo si cambió y pertenece a otro)
    if (dni !== this.selected.dni && this.isDniTaken(dni, this.selected.id)) {
      this.toast.error('DNI duplicado', 'Ese DNI ya está registrado en otro paciente');
      return;
    }

    const id = this.selected.id;

    const updated: PatientRowVM = {
      ...this.selected,
      fullName,
      dni,
      phone: phone || undefined,
      email: email || undefined,
    };

    this.patients = this.patients.map((x) => (x.id === id ? updated : x));

    // Si el modal de detalles estaba abierto con este mismo paciente, actualiza referencia
    if (this.isDetailModalOpen && this.selected?.id === id) {
      this.selected = updated;
    }

    this.closeEditModal();

    // ✅ GOODWAY
    this.toast.success('Paciente actualizado', `${updated.fullName} · DNI ${updated.dni}`);
  }

  // =========================
  // ✅ Confirmación eliminar
  // =========================
  requestDelete(p: PatientRowVM) {
    this.closeRowMenu();

    this.pendingDelete = p;
    this.confirmTitle = 'Eliminar paciente';
    this.confirmMessage = `¿Seguro que deseas eliminar a ${p.fullName}?`;
    this.isConfirmDeleteOpen = true;
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen = false;
    this.pendingDelete = null;
  }

  confirmDelete() {
    const p = this.pendingDelete;
    if (!p) return;

    this.patients = this.patients.filter((x) => x.id !== p.id);

    if (this.selected?.id === p.id) {
      this.closeDetailModal();
      this.closeEditModal();
    }

    this.closeConfirmDelete();

    // ✅ GOODWAY
    this.toast.success('Paciente eliminado', `${p.fullName}`);
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

  // ✅ ESC para cerrar confirm
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isConfirmDeleteOpen) this.closeConfirmDelete();
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

  private isDniTaken(dni: string, ignoreId?: string): boolean {
    const needle = dni.trim();
    if (!needle) return false;

    return this.patients.some((p) => {
      if (ignoreId && p.id === ignoreId) return false;
      return p.dni.trim() === needle;
    });
  }
}
