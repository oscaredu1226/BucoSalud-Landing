import { Routes } from '@angular/router';
import {HomeComponent} from './pages/home/home';
import {NotFoundComponent} from './pages/not-found/not-found';
import {PrivacyPolicyComponent} from './shared/privacy-policy/privacy-policy.component';
import {TermsComponent} from './shared/terms/terms.component';
import {AccessibilityComponent} from './shared/accessibility/accessibility.component';
import {RECEPTIONIST_ROUTES} from './receptionist/receptionist.routes';
import {LoginComponent} from './receptionist/presentation/pages/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'privacidad', component: PrivacyPolicyComponent },
  { path: 'terminos', component: TermsComponent },
  { path: 'accesibilidad', component: AccessibilityComponent },
  { path: 'receptionist', children: RECEPTIONIST_ROUTES },
  { path: 'login', component: LoginComponent },

  { path: '**', component: NotFoundComponent },
];
