import { Component, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationStart } from '@angular/router';
import { NgClass } from '@angular/common';
import { supabase } from '../../../infrastructure/supabase/supabase.client';
import { filter, Subscription } from 'rxjs';

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
export class AppShellComponent implements OnDestroy {
  private readonly sub = new Subscription();

  constructor(private readonly router: Router) {
    this.sub.add(
      this.router.events
        .pipe(filter((e) => e instanceof NavigationStart))
        .subscribe(() => this.closeMobileMenu())
    );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isMobileMenuOpen) this.closeMobileMenu();
    };
    window.addEventListener('keydown', onKeyDown);

    this.sub.add({
      unsubscribe: () => window.removeEventListener('keydown', onKeyDown),
    });
  }

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
    this.isMobileMenuOpen ? this.closeMobileMenu() : this.openMobileMenu();
  }

  openMobileMenu() {
    this.isMobileMenuOpen = true;
    this.lockBodyScroll(true);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    this.lockBodyScroll(false);
  }

  private lockBodyScroll(lock: boolean) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  async logout() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    this.closeMobileMenu();

    try {
      await supabase.auth.signOut();
    } finally {
      this.isLoggingOut = false;
      await this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.lockBodyScroll(false);
    this.sub.unsubscribe();
  }
}
