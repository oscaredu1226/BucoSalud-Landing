import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { NgClass } from '@angular/common';

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

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  logout() {
    // si luego metes auth real: aquí limpias token/session y rediriges
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
