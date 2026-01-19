import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';

import { Navbar } from '../../sections/navbar/navbar';
import { Footer } from '../../sections/footer/footer';

import { setCanonical, setOpenGraph } from '../../seo/seo.utils';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './privacy-policy.component.html',
})
export class PrivacyPolicyComponent {
  currentYear = new Date().getFullYear();

  constructor(
    private location: Location,
    private title: Title,
    private meta: Meta
  ) {
    const pageTitle = 'Política de Privacidad | Rehabilitación BucoMaxilofacial Perú';
    const pageDesc =
      'Conoce cómo se protegen tus datos personales y cómo utilizamos la información enviada desde el sitio.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDesc });

    setCanonical(this.meta, '/privacidad');
    setOpenGraph(this.meta, {
      title: pageTitle,
      description: pageDesc,
      urlPath: '/privacidad',
    });
  }

  goBack() {
    window.history.length > 1 ? this.location.back() : (window.location.href = '/');
  }
}
