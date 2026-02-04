import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

type ClinicPhoto = {
  src: string;
  alt: string;
};

@Component({
  selector: 'app-hero-section',
  imports: [NgOptimizedImage],
  templateUrl: './hero-section.html',
  standalone: true,
})
export class HeroSection {
  clinicPhotos: ClinicPhoto[] = [
    { src: '/assets/clinic/clinic-01.jpeg', alt: 'Recepción de la clínica' },
    { src: '/assets/clinic/clinic-01.jpeg', alt: 'Consultorio odontológico' },
    { src: '/assets/clinic/clinic-01.jpeg', alt: 'Equipamiento clínico' },
    { src: '/assets/clinic/clinic-01.jpeg', alt: 'Área de atención' },
  ];

  trackBySrc = (_: number, p: ClinicPhoto) => p.src;

  scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
