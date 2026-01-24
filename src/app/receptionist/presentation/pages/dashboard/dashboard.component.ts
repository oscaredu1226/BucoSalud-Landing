import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import {AppointmentHttpRepository} from '../../../infrastructure/http/repositories/appointment.http-repository';
import {PatientHttpRepository} from '../../../infrastructure/http/repositories/patient.http-repository';


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

  // header date
  todayLabel = this.buildTodayLabelES();

  // KPIs (se llenan con data real)
  kpis: Kpi[] = [
    { label: 'Citas hoy', value: '0', helper: 'Programadas' },
    { label: 'Próxima cita', value: '—', helper: 'Sin próximas' },
    { label: 'Pacientes', value: '0', helper: 'Registrados' },
    { label: 'Disponibilidad', value: 'Activa', helper: 'Hoy 10:00–18:00' },
  ];

  // tabla (se llena con data real)
  recent: RecentAppointment[] = [];

  trackByLabel = (_: number, item: Kpi) => item.label;
  trackByRecent = (_: number, item: RecentAppointment) => `${item.time}-${item.patient}`;

  async ngOnInit() {
    await this.loadDashboard();
  }

  private async loadDashboard() {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    // ===== 1) PACIENTES (conteo simple con list)
    const { data: patients, error: pErr } = await this.patientsRepo.list(5000);
    if (pErr) {
      this.hasError = true;
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    const patientsCount = (patients ?? []).length;

    // ===== 2) CITAS HOY (00:00 -> +1 día)
    const todayISO = this.todayISO();
    const fromIso = `${todayISO}T00:00:00.000Z`;
    const next = new Date(fromIso);
    next.setUTCDate(next.getUTCDate() + 1);
    const toIso = next.toISOString();

    const { data: todayAppts, error: aErr } = await this.apptRepo.listByDateRange(fromIso, toIso, 5000);
    if (aErr) {
      this.hasError = true;
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const todayRows = (todayAppts ?? []) as any[];

    // ===== 3) PROXIMA CITA (desde ahora)
    const now = new Date();
    const allForScan = todayRows; // si quieres buscar también mañana, usa apptRepo.list(...) y filtra
    const nextAppt = this.findNextAppointment(allForScan, now);

    // ===== 4) LLENAR TABLA (hoy)
    this.recent = todayRows
      .map((r) => this.toRecentVM(r))
      .sort((a, b) => a.time.localeCompare(b.time));

    // ===== 5) KPIS
    const citasHoy = String(todayRows.length);

    const proximaValue = nextAppt ? nextAppt.time : '—';
    const proximaHelper = nextAppt ? nextAppt.patient : 'Sin próximas';

    this.kpis = [
      { label: 'Citas hoy', value: citasHoy, helper: 'Programadas' },
      { label: 'Próxima cita', value: proximaValue, helper: proximaHelper },
      { label: 'Pacientes', value: String(patientsCount), helper: 'Registrados' },
      { label: 'Disponibilidad', value: 'Activa', helper: 'Hoy 10:00–18:00' },
    ];

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private findNextAppointment(rows: any[], now: Date): { time: string; patient: string } | null {
    // buscamos la más cercana desde "ahora"
    let best: { startsAt: number; time: string; patient: string } | null = null;

    for (const r of rows) {
      const startIso = r?.start_at;
      if (!startIso) continue;

      const d = new Date(startIso);
      if (Number.isNaN(d.getTime())) continue;

      if (d.getTime() < now.getTime()) continue;

      const patientName = this.patientNameFromRow(r);
      const time = this.timeFromISO(startIso);

      if (!best || d.getTime() < best.startsAt) {
        best = { startsAt: d.getTime(), time, patient: patientName };
      }
    }

    if (!best) return null;
    return { time: best.time, patient: best.patient };
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
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private mapDbStatusToUi(s: any): 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada' {
    const v = String(s ?? '').toLowerCase();
    if (v === 'pending') return 'Pendiente';
    if (v === 'confirmed') return 'Confirmada';
    if (v === 'cancelled') return 'Cancelada';
    if (v === 'completed') return 'Completada';

    // por si ya viene en español
    if (v === 'pendiente') return 'Pendiente';
    if (v === 'confirmada') return 'Confirmada';
    if (v === 'cancelada') return 'Cancelada';
    if (v === 'completada') return 'Completada';

    return 'Confirmada';
  }

  private buildTodayLabelES(): string {
    // Ej: "Jueves, 22 de Enero"
    const d = new Date();
    const weekday = d.toLocaleDateString('es-PE', { weekday: 'long' });
    const day = d.toLocaleDateString('es-PE', { day: '2-digit' });
    const month = d.toLocaleDateString('es-PE', { month: 'long' });

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(weekday)}, ${day} de ${cap(month)}`;
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
