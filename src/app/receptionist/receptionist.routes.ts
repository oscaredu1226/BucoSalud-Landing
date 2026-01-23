import { Routes } from '@angular/router';

import { AppShellComponent } from './presentation/layout/app-shell/app-shell.component';
import {DashboardComponent} from './presentation/pages/dashboard/dashboard.component';
import {AppointmentsListComponent} from './presentation/pages/appointments/list/appointments-list.component';
import {AgendaComponent} from './presentation/pages/agenda/agenda.component';
import {PatientsListComponent} from './presentation/pages/patients/list/patients-list.component';
import {AvailabilityComponent} from './presentation/pages/availability/availability.component';

export const RECEPTIONIST_ROUTES: Routes = [


  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      { path: 'dashboard', component: DashboardComponent },
      { path: 'agenda', component: AgendaComponent },

      { path: 'appointments', component: AppointmentsListComponent },


      { path: 'patients', component: PatientsListComponent },


      { path: 'availability', component: AvailabilityComponent },
    ],
  },
];
