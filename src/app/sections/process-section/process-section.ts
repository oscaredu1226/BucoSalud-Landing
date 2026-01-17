import { Component } from '@angular/core';
type Step = {
  number: string;
  icon: 'message' | 'clipboard' | 'calendar' | 'sparkles';
  title: string;
  description: string;
  highlight: string;
};
@Component({
  selector: 'app-process-section',
  imports: [],
  templateUrl: './process-section.html',
})
export class ProcessSection {
  steps: Step[] = [
    {
      number: '01',
      icon: 'message',
      title: 'Consulta Inicial',
      description:
        'Comenzamos con una conversación empática para entender tu historia, preocupaciones y objetivos. Sin presión, solo escuchando.',
      highlight: 'Consulta gratuita disponible',
    },
    {
      number: '02',
      icon: 'clipboard',
      title: 'Evaluación Integral',
      description:
        'Una evaluación exhaustiva de salud oral con imágenes avanzadas, coordinando con tu equipo oncológico cuando sea necesario.',
      highlight: 'Enfoque de cuidado coordinado',
    },
    {
      number: '03',
      icon: 'calendar',
      title: 'Plan de Tratamiento Personalizado',
      description:
        'Juntos, creamos un plan de rehabilitación personalizado que respeta tu ritmo, presupuesto y consideraciones de salud.',
      highlight: 'Opciones de pago flexibles',
    },
    {
      number: '04',
      icon: 'sparkles',
      title: 'Rehabilitación Cuidadosa',
      description:
        'Tu tratamiento se realiza con el máximo cuidado, utilizando técnicas optimizadas para pacientes post-oncológicos.',
      highlight: 'Protocolos especializados',
    },
  ];

  scrollToSection(id: string) {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  firstWord(title: string): string {
    return title.split(' ')[0] ?? title;
  }
}
