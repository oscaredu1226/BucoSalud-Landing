import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AppointmentHttpRepository } from '../../../infrastructure/http/repositories/appointment.http-repository';
import { PatientHttpRepository } from '../../../infrastructure/http/repositories/patient.http-repository';

type Kpi = { label: string; value: string; helper: string };
type RecentAppointment = {
  time: string;
  patient: string;
  reason: string;
  status: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
};

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  constructor(
    private readonly apptRepo: AppointmentHttpRepository,
    private readonly patientsRepo: PatientHttpRepository,
    private readonly cdr: ChangeDetectorRef
  ) {}

  isLoading = false;
  hasError = false;

  // ✅ skeleton helpers
  readonly skeletonKpis = Array.from({ length: 4 });
  readonly skeletonRows = Array.from({ length: 6 });
  readonly skeletonCards = Array.from({ length: 5 });

  todayLabel = this.buildTodayLabelES();

  kpis: Kpi[] = [
    { label: 'Citas hoy', value: '0', helper: 'Programadas' },
    { label: 'Próxima cita', value: '—', helper: 'Sin próximas' },
    { label: 'Pacientes', value: '0', helper: 'Registrados' },
    { label: 'Disponibilidad', value: 'Activa', helper: 'Hoy 10:00–18:00' },
  ];

  recent: RecentAppointment[] = [];

  trackByLabel = (_: number, item: Kpi) => item.label;
  trackByRecent = (_: number, item: RecentAppointment) => `${item.time}-${item.patient}`;

  async ngOnInit() {
    await this.loadDashboard();
  }

  async retry() {
    await this.loadDashboard();
  }

  private async loadDashboard() {
    try {
      this.isLoading = true;
      this.hasError = false;
      this.cdr.detectChanges();

      // ===== 1) PACIENTES
      const { data: patients, error: pErr } = await this.patientsRepo.list(5000);
      if (pErr) throw pErr;
      const patientsCount = (patients ?? []).length;

      // ===== 2) CITAS HOY (rango local → UTC)
      const nowLocal = new Date();
      const fromLocal = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 0, 0, 0, 0);
      const toLocal = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 23, 59, 59, 999);

      const { data: todayAppts, error: aErr } =
        await this.apptRepo.listByDateRange(fromLocal.toISOString(), toLocal.toISOString(), 5000);
      if (aErr) throw aErr;

      const todayRows = (todayAppts ?? []) as any[];

      // ===== 3) PRÓXIMA CITA
      const nextAppt = this.findNextAppointment(todayRows, new Date());

      // ===== 4) TABLA
      this.recent = todayRows
        .map((r) => this.toRecentVM(r))
        .sort((a, b) => a.time.localeCompare(b.time));

      // ===== 5) KPIS
      this.kpis = [
        { label: 'Citas hoy', value: String(todayRows.length), helper: 'Programadas' },
        {
          label: 'Próxima cita',
          value: nextAppt ? nextAppt.time : '—',
          helper: nextAppt ? nextAppt.patient : 'Sin próximas',
        },
        { label: 'Pacientes', value: String(patientsCount), helper: 'Registrados' },
        { label: 'Disponibilidad', value: 'Activa', helper: 'Hoy 10:00–18:00' },
      ];

    } catch {
      this.hasError = true;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // HELPERS
  // =========================
  private findNextAppointment(rows: any[], now: Date): { time: string; patient: string } | null {
    let best: { startsAt: number; time: string; patient: string } | null = null;

    for (const r of rows) {
      const startIso = r?.start_at;
      if (!startIso) continue;

      const d = new Date(startIso);
      if (Number.isNaN(d.getTime()) || d.getTime() < now.getTime()) continue;

      const patientName = this.patientNameFromRow(r);
      const time = this.timeFromISO(startIso);

      if (!best || d.getTime() < best.startsAt) {
        best = { startsAt: d.getTime(), time, patient: patientName };
      }
    }

    return best ? { time: best.time, patient: best.patient } : null;
  }

  private toRecentVM(r: any): RecentAppointment {
    return {
      time: this.timeFromISO(r.start_at),
      patient: this.patientNameFromRow(r),
      reason: r.reason ?? '—',
      status: this.mapDbStatusToUi(r.status),
    };
  }

  private patientNameFromRow(r: any): string {
    const p = r.patient ?? null;
    if (!p) return '(Sin paciente)';
    const full = `${p.first_names ?? ''} ${p.last_names ?? ''}`.trim();
    return full || '(Sin paciente)';
  }

  private timeFromISO(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '00:00';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private mapDbStatusToUi(s: any): 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada' {
    const v = String(s ?? '').toLowerCase();
    if (v === 'pending' || v === 'pendiente') return 'Pendiente';
    if (v === 'confirmed' || v === 'confirmada') return 'Confirmada';
    if (v === 'cancelled' || v === 'cancelada') return 'Cancelada';
    if (v === 'completed' || v === 'completada') return 'Completada';
    return 'Confirmada';
  }

  private buildTodayLabelES(): string {
    const d = new Date();
    const weekday = d.toLocaleDateString('es-PE', { weekday: 'long' });
    const day = d.toLocaleDateString('es-PE', { day: '2-digit' });
    const month = d.toLocaleDateString('es-PE', { month: 'long' });
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(weekday)}, ${day} de ${cap(month)}`;
  }
}
