import { Component } from '@angular/core';
import {Footer} from '../../sections/footer/footer';
import {Navbar} from '../../sections/navbar/navbar';
import {Meta, Title} from '@angular/platform-browser';


@Component({
  selector: 'app-accessibility',
  standalone: true,
  imports: [
    Footer,
    Navbar
  ],
  templateUrl: './accessibility.component.html',
})
export class AccessibilityComponent {
  constructor(private title: Title, private meta: Meta) {
    this.title.setTitle('Accesibilidad | Rehabilitación BucoMaxilofacial Perú');
    this.meta.updateTag({
      name: 'description',
      content:
        'Declaración de accesibilidad de Rehabilitación BucoMaxilofacial Perú. Nuestro compromiso para brindar una experiencia web accesible para todos.',
    });
  }
  currentYear = new Date().getFullYear();

  goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }
}
