import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import {supabase} from '../../../infrastructure/supabase/supabase.client';

type NavItem = {
  label: string;
  path: string;
  icon: 'dashboard' | 'agenda' | 'appointments' | 'patients' | 'availability' | 'settings';
};

@Component({
  selector: 'app-receptionist-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  constructor(private readonly router: Router) {}

  readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/receptionist/dashboard', icon: 'dashboard' },
    { label: 'Agenda', path: '/receptionist/agenda', icon: 'agenda' },
    { label: 'Citas', path: '/receptionist/appointments', icon: 'appointments' },
    { label: 'Pacientes', path: '/receptionist/patients', icon: 'patients' },
    { label: 'Disponibilidad', path: '/receptionist/availability', icon: 'availability' },
  ];

  isMobileMenuOpen = false;
  isLoggingOut = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  async logout() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    this.closeMobileMenu();

    try {
      const { error } = await supabase.auth.signOut();
    } finally {
      this.isLoggingOut = false;
      await this.router.navigate(['/login']);
    }
  }
}
