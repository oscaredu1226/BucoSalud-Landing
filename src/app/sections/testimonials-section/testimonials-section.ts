import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';

type Testimonial = {
  quote: string;
  name: string;
  context: string;
  initials: string;
};

type HeroSlide = {
  src: string;
  alt: string;
  badgeText: string;
};

@Component({
  selector: 'app-testimonials-section',
  imports: [],
  templateUrl: './testimonials-section.html',
})
export class TestimonialsSection implements OnInit, OnDestroy {
  constructor(private cdr: ChangeDetectorRef) {}

  heroSlides: HeroSlide[] = [
    {
      src: 'assets/patient-smile.jpg',
      alt: 'Paciente feliz con su nueva sonrisa',
      badgeText: '+2,000 Sonrisas Restauradas',
    },
    {
      src: 'assets/patient-smile-2.jpg',
      alt: 'Paciente sonriendo durante consulta',
      badgeText: 'Atención cálida y especializada',
    },
    {
      src: 'assets/patient-smile-3.jpg',
      alt: 'Paciente mostrando su nueva sonrisa',
      badgeText: 'Rehabilitación con confianza',
    },
  ];

  currentSlide = 0;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  testimonials: Testimonial[] = [
    {
      quote:
        'Después de mi tratamiento contra el cáncer, pensé que nunca volvería a sonreír con confianza. La Dra. Vásquez y su equipo me devolvieron no solo mis dientes, sino mi autoestima.',
      name: 'Jennifer M.',
      context: 'Sobreviviente de cáncer de mama, 3 años post-tratamiento',
      initials: this.getInitials('Jennifer M.'),
    },
    {
      quote:
        'El nivel de comprensión aquí es extraordinario. Realmente entienden lo que es pasar por un tratamiento de cáncer, e hicieron cada paso cómodo.',
      name: 'Roberto L.',
      context: 'Sobreviviente de cáncer de cabeza y cuello',
      initials: this.getInitials('Roberto L.'),
    },
    {
      quote:
        'Estaba nerviosa por el trabajo dental después de la radiación, pero la experiencia del equipo y su enfoque gentil me pusieron completamente tranquila. La mejor decisión que tomé.',
      name: 'Patricia K.',
      context: 'Sobreviviente de cáncer oral, rehabilitación completa',
      initials: this.getInitials('Patricia K.'),
    },
  ];

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
  }

  prevSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    // si el usuario interactúa, opcionalmente “reinicia” el autoplay:
    this.resumeAutoPlay();
  }

  pauseAutoPlay(): void {
    this.stopAutoPlay();
  }

  resumeAutoPlay(): void {
    this.startAutoPlay();
  }

  private startAutoPlay(): void {
    if (this.heroSlides.length <= 1) return;

    this.stopAutoPlay();
    this.intervalId = setInterval(() => {
      this.nextSlide();
      this.cdr.markForCheck(); // 👈 asegura que la vista se actualice
    }, 4500);
  }

  private stopAutoPlay(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}
