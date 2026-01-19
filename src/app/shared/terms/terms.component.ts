import { Component } from '@angular/core';
import { Navbar } from '../../sections/navbar/navbar';
import { Footer } from '../../sections/footer/footer';
import { Meta, Title } from '@angular/platform-browser';
import { setCanonical, setOpenGraph } from '../../seo/seo.utils';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './terms.component.html',
})
export class TermsComponent {
  currentYear = new Date().getFullYear();

  constructor(private title: Title, private meta: Meta) {
    const pageTitle = 'Términos de Servicio | Rehabilitación BucoMaxilofacial Perú';
    const pageDesc =
      'Revisa los términos y condiciones de uso del sitio web de Rehabilitación BucoMaxilofacial Perú, incluyendo servicios, citas y limitación de responsabilidad.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDesc });

    setCanonical(this.meta, '/terminos');
    setOpenGraph(this.meta, {
      title: pageTitle,
      description: pageDesc,
      urlPath: '/terminos',
    });
  }

  goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }
}
