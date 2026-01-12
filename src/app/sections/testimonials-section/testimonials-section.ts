import { Component } from '@angular/core';

type Testimonial = {
  quote: string;
  name: string;
  context: string;
};
@Component({
  selector: 'app-testimonials-section',
  imports: [],
  templateUrl: './testimonials-section.html',
})
export class TestimonialsSection {
  testimonials: Testimonial[] = [
    {
      quote:
        'Después de mi tratamiento contra el cáncer, pensé que nunca volvería a sonreír con confianza. La Dra. Vásquez y su equipo me devolvieron no solo mis dientes, sino mi autoestima.',
      name: 'Jennifer M.',
      context: 'Sobreviviente de cáncer de mama, 3 años post-tratamiento',
    },
    {
      quote:
        'El nivel de comprensión aquí es extraordinario. Realmente entienden lo que es pasar por un tratamiento de cáncer, e hicieron cada paso cómodo.',
      name: 'Roberto L.',
      context: 'Sobreviviente de cáncer de cabeza y cuello',
    },
    {
      quote:
        'Estaba nerviosa por el trabajo dental después de la radiación, pero la experiencia del equipo y su enfoque gentil me pusieron completamente tranquila. La mejor decisión que tomé.',
      name: 'Patricia K.',
      context: 'Sobreviviente de cáncer oral, rehabilitación completa',
    },
  ];

  trackByIndex = (i: number) => i;

}
