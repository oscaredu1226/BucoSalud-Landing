import { Component } from '@angular/core';

type Service = {
  icon: 'stethoscope' | 'shieldCheck' | 'smile' | 'pill' | 'sparkles' | 'heartHandshake';
  title: string;
  description: string;
};
@Component({
  selector: 'app-services-section',
  imports: [],
  templateUrl: './services-section.html',
})
export class ServicesSection {
  services: Service[] = [
    {
      icon: 'stethoscope',
      title: 'Evaluación Oral Integral',
      description:
        'Diagnóstico completo de salud dental post-tratamiento oncológico, identificando necesidades específicas de rehabilitación.',
    },
    {
      icon: 'shieldCheck',
      title: 'Rehabilitación con Implantes',
      description:
        'Implantes dentales avanzados para pacientes que han recibido radioterapia, con protocolos especializados para una óptima cicatrización.',
    },
    {
      icon: 'smile',
      title: 'Odontología Restauradora',
      description:
        'Coronas, puentes y prótesis personalizadas para restaurar la función y estética natural después del tratamiento del cáncer.',
    },
    {
      icon: 'pill',
      title: 'Manejo de Xerostomía',
      description:
        'Cuidado especializado para condiciones de boca seca comunes después de la radiación, incluyendo tratamientos preventivos.',
    },
    {
      icon: 'sparkles',
      title: 'Rehabilitación Estética',
      description:
        'Soluciones cosméticas para restaurar tu sonrisa con confianza, incluyendo carillas y reconstrucción completa de boca.',
    },
    {
      icon: 'heartHandshake',
      title: 'Programas de Apoyo',
      description:
        'Soporte continuo incluyendo orientación nutricional, educación en higiene oral y coordinación con tu equipo oncológico.',
    },
  ];

  trackByTitle = (_: number, item: Service) => item.title;

}
