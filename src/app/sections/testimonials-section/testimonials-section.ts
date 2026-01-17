import { Component } from '@angular/core';

type Testimonial = {
  quote: string;
  name: string;
  context: string;
  initials: string;
};
@Component({
  selector: 'app-testimonials-section',
  imports: [],
  templateUrl: './testimonials-section.html',
})
export class TestimonialsSection {
  patientImage = 'assets/patient-smile.jpg';

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

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}
