import { Component } from '@angular/core';

type ValueItem = {
  icon: 'heart' | 'shield' | 'users' | 'award';
  title: string;
  description: string;
};


@Component({
  selector: 'app-about-section',
  imports: [],
  templateUrl: './about-section.html',
})
export class AboutSection {
  clinicImage = 'assets/clinic-interior.jpg';

  values: ValueItem[] = [
    {
      icon: 'heart',
      title: 'Acompañamiento Humano',
      description:
        'Te acompañamos desde el primer diagnóstico hasta la rehabilitación definitiva, con un trato empático y respetuoso en cada etapa.',
    },
    {
      icon: 'shield',
      title: 'Alta Complejidad Clínica',
      description:
        'Atención odontológica especializada para el paciente oncológico, con protocolos seguros y enfoque buco maxilofacial.',
    },
    {
      icon: 'users',
      title: 'Trabajo Interdisciplinario',
      description:
        'Coordinamos con tu equipo médico para una recuperación integral, alineando el plan odontológico con tu tratamiento.',
    },
    {
      icon: 'award',
      title: 'Excelencia y Referencia',
      description:
        'Buscamos ser un centro referente por calidad humana, excelencia clínica y resultados que devuelven dignidad y bienestar.',
    },
  ];

  trackByTitle = (_: number, v: ValueItem) => v.title;
}
