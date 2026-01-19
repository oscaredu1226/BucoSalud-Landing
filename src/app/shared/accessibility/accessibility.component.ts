import { Component } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { setCanonical, setOpenGraph } from '../../seo/seo.utils';
import {Footer} from '../../sections/footer/footer';
import {Navbar} from '../../sections/navbar/navbar';

@Component({
  selector: 'app-accessibility',
  standalone: true,
  imports: [Footer, Navbar],
  templateUrl: './accessibility.component.html',
})
export class AccessibilityComponent {
  currentYear = new Date().getFullYear();

  constructor(private title: Title, private meta: Meta) {
    const pageTitle = 'Accesibilidad | Rehabilitación BucoMaxilofacial Perú';
    const pageDesc =
      'Declaración de accesibilidad de Rehabilitación BucoMaxilofacial Perú. Nuestro compromiso para brindar una experiencia web accesible para todos.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDesc });

    setCanonical(this.meta, '/accesibilidad');
    setOpenGraph(this.meta, {
      title: pageTitle,
      description: pageDesc,
      urlPath: '/accesibilidad',
    });
  }

  goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }
}
