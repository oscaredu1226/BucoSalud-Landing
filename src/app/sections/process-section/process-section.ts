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
  standalone: true,

})
export class ProcessSection {
  steps: Step[] = [
    {
      number: '01',
      icon: 'clipboard',
      title: 'Evaluación y Preparación Prequirúrgica',
      description:
        'Realizamos una evaluación integral de la cavidad oral y preparamos la boca para reducir riesgos durante el tratamiento oncológico: restauraciones, endodoncias, extracciones necesarias, prótesis, limpieza y desinfección bucal.',
      highlight: 'Prevención de infecciones y complicaciones',
    },
    {
      number: '02',
      icon: 'message',
      title: 'Coordinación con el Equipo Quirúrgico',
      description:
        'Tomamos modelos y coordinamos con el cirujano de cabeza y cuello para planificar el obturador quirúrgico y definir el protocolo de rehabilitación postoperatoria.',
      highlight: 'Cuidado coordinado y planificado',
    },
    {
      number: '03',
      icon: 'calendar',
      title: 'Obturador Inmediato Postcirugía',
      description:
        'Tras la intervención, instalamos el obturador quirúrgico para favorecer la cicatrización y ayudar desde el primer día a hablar y alimentarse con mayor seguridad.',
      highlight: 'Soporte funcional desde el primer día',
    },
    {
      number: '04',
      icon: 'sparkles',
      title: 'Rehabilitación Provisional y Definitiva',
      description:
        'Acompañamos la cicatrización con un obturador provisional durante 8 a 10 meses, con controles y ajustes. Luego realizamos la rehabilitación definitiva para devolver función oral, estética, habla y calidad de vida.',
      highlight: 'Controles, ajustes y acompañamiento continuo',
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
