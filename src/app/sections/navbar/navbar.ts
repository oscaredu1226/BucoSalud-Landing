import { Component } from '@angular/core';

type NavLink = { href: string; label: string };

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
})
export class Navbar {
  isOpen = false;

  navLinks: NavLink[] = [
    { href: '#servicios', label: 'Servicios' },
    { href: '#proceso', label: 'Nuestro Proceso' },
    { href: '#nosotros', label: 'Nosotros' },
    { href: '#equipo', label: 'Equipo' },
    { href: '#testimonios', label: 'Testimonios' },
    { href: '#faq', label: 'Preguntas Frecuentes' },
    { href: '#contacto', label: 'Contacto' },
  ];

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  closeMenu() {
    this.isOpen = false;
  }

  scrollToSection(href: string) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    this.closeMenu();
  }

  scrollToTop(event?: Event) {
    event?.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.closeMenu();
  }

}
