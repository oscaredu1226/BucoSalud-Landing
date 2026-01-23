import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../shared/toast/toast.service';
import {
  PatientHttpRepository,
  PatientRow,
} from '../../../../infrastructure/http/repositories/patient.http-repository';

type PatientStatus = 'active' | 'inactive';

type PatientRowVM = {
  id: string; // UUID real
  fullName: string;
  dni: string;
  phone?: string;
  email?: string;
  lastVisit?: string; // (no está en DB por ahora)
  status: PatientStatus; // (no está en DB por ahora, lo dejamos en UI)
};

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-list.component.html',
})
export class PatientsListComponent implements OnInit {
  constructor(
    private readonly toast: ToastService,
    private readonly patientsRepo: PatientHttpRepository,

  ) {}

  // ===== State =====
  loading = false;

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

  // forms (UI)
  formFullName = '';
  formDni = '';
  formPhone = '';
  formEmail = '';

  editFullName = '';
  editDni = '';
  editPhone = '';
  editEmail = '';

  // data (ahora real)
  patients: PatientRowVM[] = [];

  // =========================
  // Init
  // =========================
  async ngOnInit() {
    await this.loadPatients();
  }

  private async loadPatients() {
    this.loading = true;

    const { data, error } = await this.patientsRepo.list(200);

    this.loading = false;

    if (error) {
      this.toast.error('Error', error.message);
      return;
    }

    this.patients = (data ?? []).map((r) => this.toVM(r));
  }

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

  async createPatient() {
    const fullName = this.formFullName.trim();
    const dni = this.formDni.trim();
    const phone = this.formPhone.trim();
    const email = this.formEmail.trim();

    if (!fullName) {
      this.toast.error('Campos incompletos', 'Ingresa el nombre completo');
      return;
    }
    if (!dni) {
      this.toast.error('Campos incompletos', 'Ingresa el DNI');
      return;
    }

    const split = this.splitFullName(fullName);
    if (!split) {
      this.toast.error('Nombre inválido', 'Ingresa al menos nombres y apellidos (2 palabras)');
      return;
    }

    this.loading = true;

    const { data, error } = await this.patientsRepo.create({
      first_names: split.first_names,
      last_names: split.last_names,
      dni,
      phone: phone || null,
      email: email || null,
      notes: null,
    });

    this.loading = false;

    if (error) {
      // DNI duplicado (unique constraint)
      if (this.isUniqueViolation(error)) {
        this.toast.error('DNI duplicado', 'Ya existe un paciente con ese DNI');
        return;
      }
      this.toast.error('Error', error.message);
      return;
    }

    if (!data) {
      this.toast.error('Error', 'No se pudo crear el paciente');
      return;
    }

    const newPatient = this.toVM(data);
    this.patients = [newPatient, ...this.patients];
    this.closeCreateModal();

    this.toast.success('Paciente creado', `${newPatient.fullName} · DNI ${newPatient.dni}`);
  }

  // =========================
  // Modales: Details
  // =========================
  openDetailModal(p: PatientRowVM) {
    this.closeRowMenu();
    this.selected = p;
    this.isDetailModalOpen = true;
    this.toast.info('Detalles', `Abriendo ${p.id}`);
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

    this.isEditModalOpen = true;
    this.toast.info('Editar', `Editando ${p.id}`);
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selected = null;
  }

  async saveEdit() {
    if (!this.selected) {
      this.toast.error('Error', 'No se encontró el paciente a editar');
      return;
    }

    const fullName = this.editFullName.trim();
    const dni = this.editDni.trim();
    const phone = this.editPhone.trim();
    const email = this.editEmail.trim();

    if (!fullName) {
      this.toast.error('Campos incompletos', 'El nombre no puede estar vacío');
      return;
    }
    if (!dni) {
      this.toast.error('Campos incompletos', 'El DNI no puede estar vacío');
      return;
    }

    const split = this.splitFullName(fullName);
    if (!split) {
      this.toast.error('Nombre inválido', 'Ingresa al menos nombres y apellidos (2 palabras)');
      return;
    }

    const id = this.selected.id;

    this.loading = true;

    const { data, error } = await this.patientsRepo.update(id, {
      first_names: split.first_names,
      last_names: split.last_names,
      dni,
      phone: phone || null,
      email: email || null,
    });

    this.loading = false;

    if (error) {
      if (this.isUniqueViolation(error)) {
        this.toast.error('DNI duplicado', 'Ese DNI ya está registrado en otro paciente');
        return;
      }
      this.toast.error('Error', error.message);
      return;
    }

    if (!data) {
      this.toast.error('Error', 'No se pudo actualizar el paciente');
      return;
    }

    const updated = this.toVM(data);

    this.patients = this.patients.map((x) => (x.id === id ? updated : x));

    if (this.isDetailModalOpen && this.selected?.id === id) {
      this.selected = updated;
    }

    this.closeEditModal();
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

  async confirmDelete() {
    const p = this.pendingDelete;
    if (!p) return;

    this.loading = true;

    const { error } = await this.patientsRepo.remove(p.id);

    this.loading = false;

    if (error) {
      // Si tiene citas asociadas, tu FK está con RESTRICT (no deja borrar)
      this.toast.error('No se pudo eliminar', error.message);
      return;
    }

    this.patients = this.patients.filter((x) => x.id !== p.id);

    if (this.selected?.id === p.id) {
      this.closeDetailModal();
      this.closeEditModal();
    }

    this.closeConfirmDelete();
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
  // Mapping + helpers
  // =========================
  private toVM(r: PatientRow): PatientRowVM {
    const fullName = `${r.first_names ?? ''} ${r.last_names ?? ''}`.trim();

    return {
      id: r.id,
      fullName: fullName || '(Sin nombre)',
      dni: r.dni,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      lastVisit: undefined, // no lo tenemos en DB aún
      status: 'active', // MVP: default active
    };
  }

  private splitFullName(fullName: string): { first_names: string; last_names: string } | null {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;

    const last_names = parts.slice(-1).join(' ');
    const first_names = parts.slice(0, -1).join(' ');

    if (!first_names || !last_names) return null;
    return { first_names, last_names };
  }

  // Detecta unique violation típico de Postgres (dni unique)
  private isUniqueViolation(error: any): boolean {
    // Supabase suele devolver code '23505' o un mensaje que contiene 'duplicate key value'
    const code = error?.code;
    const msg = String(error?.message ?? '');
    return code === '23505' || msg.toLowerCase().includes('duplicate key');
  }
}
