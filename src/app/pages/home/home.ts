import { Component } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { Navbar } from '../../sections/navbar/navbar';
import { ChatWidget } from '../../components/chat-widget/chat-widget';
import { Footer } from '../../sections/footer/footer';
import { ContactSection } from '../../sections/contact-section/contact-section';
import { TestimonialsSection } from '../../sections/testimonials-section/testimonials-section';
import { AboutSection } from '../../sections/about-section/about-section';
import { ServicesSection } from '../../sections/services-section/services-section';
import { FaqSection } from '../../sections/faq-section/faq-section';
import { TeamSection } from '../../sections/team-section/team-section';
import { ProcessSection } from '../../sections/process-section/process-section';
import { HeroSection } from '../../sections/hero-section/hero-section';

import { setCanonical, setOpenGraph } from '../../seo/seo.utils';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Navbar,
    ChatWidget,
    Footer,
    ContactSection,
    TestimonialsSection,
    AboutSection,
    ServicesSection,
    FaqSection,
    TeamSection,
    ProcessSection,
    HeroSection
  ],
  templateUrl: './home.html',
})
export class HomeComponent {
  constructor(private title: Title, private meta: Meta) {
    const pageTitle = 'Rehabilitación Dental Oncológica | Renova Dental';
    const pageDesc =
      'Clínica especializada en rehabilitación bucomaxilofacial y dental para pacientes oncológicos. Atención humana, segura y personalizada.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({
      name: 'description',
      content: pageDesc,
    });

    setCanonical(this.meta, '/');
    setOpenGraph(this.meta, {
      title: pageTitle,
      description: pageDesc,
      urlPath: '/',
    });
  }
}
