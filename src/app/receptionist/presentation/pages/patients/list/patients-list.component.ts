import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../shared/toast/toast.service';
import {
  PatientHttpRepository,
  PatientRow,
} from '../../../../infrastructure/http/repositories/patient.http-repository';
import { AppointmentHttpRepository } from '../../../../infrastructure/http/repositories/appointment.http-repository';

type PatientStatus = 'active' | 'inactive';

type PatientRowVM = {
  id: string;
  fullName: string;
  dni: string;
  phone?: string;
  email?: string;
  lastVisit?: string;
  status: PatientStatus;
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
    private readonly apptRepo: AppointmentHttpRepository,
    private readonly cdr: ChangeDetectorRef
  ) {}

  // ===== State =====
  loading = false;

  // skeleton helpers
  readonly skeletonRows = Array.from({ length: 6 });
  readonly skeletonCards = Array.from({ length: 5 });

  // search
  query = '';

  // dropdown
  openRowMenuId: string | null = null;
  menuPos = { top: 0, left: 0 };
  menuPatient: PatientRowVM | null = null;

  // modals
  isCreateModalOpen = false;
  isDetailModalOpen = false;
  isEditModalOpen = false;
  isConfirmDeleteOpen = false;

  confirmTitle = 'Eliminar paciente';
  confirmMessage = '';
  pendingDelete: PatientRowVM | null = null;

  selected: PatientRowVM | null = null;

  // forms
  formFullName = '';
  formDni = '';
  formPhone = '';
  formEmail = '';

  editFullName = '';
  editDni = '';
  editPhone = '';
  editEmail = '';

  patients: PatientRowVM[] = [];

  async ngOnInit() {
    await this.loadPatients();
  }

  private async loadPatients() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const { data, error } = await this.patientsRepo.list(200);
      if (error) throw error;

      this.patients = (data ?? []).map((r) => this.toVM(r));
      this.cdr.detectChanges();

      const ids = this.patients.map((p) => p.id);
      await this.loadLastVisits(ids);
    } catch (e: any) {
      this.toast.error('Error', e?.message ?? 'No se pudieron cargar los pacientes');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadLastVisits(patientIds: string[]) {
    if (!patientIds.length) return;

    const { data } = await this.apptRepo.lastByPatientIds(patientIds, 5000);

    const lastMap = new Map<string, string>();
    for (const a of (data ?? []) as any[]) {
      if (!lastMap.has(a.patient_id)) lastMap.set(a.patient_id, a.start_at);
    }

    this.patients = this.patients.map((p) => ({
      ...p,
      lastVisit: lastMap.get(p.id),
    }));

    if (this.isDetailModalOpen && this.selected) {
      const updated = this.patients.find((x) => x.id === this.selected!.id);
      if (updated) this.selected = updated;
    }

    this.cdr.detectChanges();
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
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Sin citas';

    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // =========================
  // Row menu
  // =========================
  toggleRowMenu(p: PatientRowVM, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.openRowMenuId === p.id) {
      this.closeRowMenu();
      return;
    }

    this.openRowMenuId = p.id;
    this.menuPatient = p;

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 208;
    const padding = 8;

    let left = rect.right - menuWidth;
    left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));

    this.menuPos = { top: rect.bottom + 8, left };
    this.cdr.detectChanges();
  }

  closeRowMenu() {
    this.openRowMenuId = null;
    this.menuPatient = null;
  }

  @HostListener('window:resize')
  onResize() {
    this.closeRowMenu();
  }

  // =========================
  // Modals
  // =========================
  openCreateModal() {
    this.closeRowMenu();
    this.isCreateModalOpen = true;
    this.formFullName = this.formDni = this.formPhone = this.formEmail = '';
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  async createPatient() {
    const split = this.splitFullName(this.formFullName.trim());
    if (!split || !this.formDni.trim()) {
      this.toast.error('Campos incompletos', 'Nombre y DNI son obligatorios');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const { data, error } = await this.patientsRepo.create({
      ...split,
      dni: this.formDni.trim(),
      phone: this.formPhone || null,
      email: this.formEmail || null,
      notes: null,
    });

    this.loading = false;

    if (error || !data) {
      this.toast.error('Error', error?.message ?? 'No se pudo crear el paciente');
      this.cdr.detectChanges();
      return;
    }

    const newPatient = this.toVM(data);
    this.patients = [newPatient, ...this.patients];
    this.closeCreateModal();
    this.toast.success('Paciente creado', newPatient.fullName);
    await this.loadLastVisits([newPatient.id]);
  }

  openDetailModal(p: PatientRowVM) {
    this.closeRowMenu();
    this.selected = p;
    this.isDetailModalOpen = true;
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.selected = null;
  }

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

  async saveEdit() {
    if (!this.selected) return;

    const split = this.splitFullName(this.editFullName.trim());
    if (!split || !this.editDni.trim()) {
      this.toast.error('Campos incompletos', 'Nombre y DNI son obligatorios');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const { data, error } = await this.patientsRepo.update(this.selected.id, {
      ...split,
      dni: this.editDni.trim(),
      phone: this.editPhone || null,
      email: this.editEmail || null,
    });

    this.loading = false;

    if (error || !data) {
      this.toast.error('Error', error?.message ?? 'No se pudo actualizar');
      this.cdr.detectChanges();
      return;
    }

    const updated = this.toVM(data);
    const prev = this.patients.find((x) => x.id === updated.id);
    updated.lastVisit = prev?.lastVisit;

    this.patients = this.patients.map((x) => (x.id === updated.id ? updated : x));
    this.selected = updated;
    this.closeEditModal();
    this.toast.success('Paciente actualizado', updated.fullName);
  }

  requestDelete(p: PatientRowVM) {
    this.closeRowMenu();
    this.pendingDelete = p;
    this.confirmMessage = `¿Seguro que deseas eliminar a ${p.fullName}?`;
    this.isConfirmDeleteOpen = true;
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen = false;
    this.pendingDelete = null;
  }

  async confirmDelete() {
    if (!this.pendingDelete) return;

    this.loading = true;
    this.cdr.detectChanges();

    const { error } = await this.patientsRepo.remove(this.pendingDelete.id);
    this.loading = false;

    if (error) {
      this.toast.error('Error', error.message);
      this.cdr.detectChanges();
      return;
    }

    this.patients = this.patients.filter((x) => x.id !== this.pendingDelete!.id);
    this.closeConfirmDelete();
    this.toast.success('Paciente eliminado', this.pendingDelete!.fullName);
  }

  // =========================
  // Global listeners
  // =========================
  @HostListener('document:click')
  onDocClick() {
    this.closeRowMenu();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeRowMenu();
    this.closeConfirmDelete();
  }

  // =========================
  // Mapping
  // =========================
  private toVM(r: PatientRow): PatientRowVM {
    return {
      id: r.id,
      fullName: `${r.first_names ?? ''} ${r.last_names ?? ''}`.trim(),
      dni: r.dni,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      lastVisit: undefined,
      status: 'active',
    };
  }

  private splitFullName(fullName: string) {
    const parts = fullName.split(/\s+/);
    if (parts.length < 2) return null;
    return {
      first_names: parts.slice(0, -1).join(' '),
      last_names: parts.slice(-1).join(' '),
    };
  }
}
