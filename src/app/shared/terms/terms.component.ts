import { Component } from '@angular/core';
import {Navbar} from '../../sections/navbar/navbar';
import {Footer} from '../../sections/footer/footer';
import {Meta, Title} from '@angular/platform-browser';


@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './terms.component.html',
})
export class TermsComponent {
  constructor(private title: Title, private meta: Meta) {
    this.title.setTitle('Términos de Servicio | Rehabilitación BucoMaxilofacial Perú');
    this.meta.updateTag({
      name: 'description',
      content:
        'Revisa los términos y condiciones de uso del sitio web de Rehabilitación BucoMaxilofacial Perú, incluyendo servicios, citas y limitación de responsabilidad.',
    });
  }
  currentYear = new Date().getFullYear();

  goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }
}
