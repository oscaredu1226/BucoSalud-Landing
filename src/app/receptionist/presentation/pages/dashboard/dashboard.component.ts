import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {NgClass} from '@angular/common';

type Kpi = { label: string; value: string; helper: string };
type RecentAppointment = {
  time: string;
  patient: string;
  reason: string;
  status: 'Pendiente' | 'Confirmada' | 'Cancelada';
};

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  kpis: Kpi[] = [
    { label: 'Citas hoy', value: '8', helper: 'Programadas' },
    { label: 'Pendientes', value: '3', helper: 'Por confirmar' },
    { label: 'Pacientes', value: '124', helper: 'Registrados' },
    { label: 'Disponibilidad', value: 'Activa', helper: 'Hoy 10:00–18:00' },
  ];


  recent: RecentAppointment[] = [
    { time: '10:00', patient: 'María Pérez', reason: 'Evaluación', status: 'Confirmada' },
    { time: '11:00', patient: 'Luis Rojas', reason: 'Control', status: 'Pendiente' },
    { time: '12:00', patient: 'Ana Torres', reason: 'Consulta', status: 'Pendiente' },
    { time: '15:00', patient: 'Carlos Díaz', reason: 'Revisión', status: 'Cancelada' },
  ];

  trackByLabel = (_: number, item: Kpi) => item.label;
  trackByRecent = (_: number, item: RecentAppointment) => `${item.time}-${item.patient}`;
}
