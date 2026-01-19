import { Component } from '@angular/core';
import {NgStyle} from '@angular/common';

type Faq = {
  question: string;
  answer: string;
};

@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [
    NgStyle
  ],
  templateUrl: './faq-section.html',
})
export class FaqSection {
  faqs: Faq[] = [
    {
      question: '¿Cuál es el costo del tratamiento?',
      answer:
        'El tratamiento se diseña de forma personalizada. El costo depende del tipo de cirugía previa y del plan de rehabilitación indicado. Antes de iniciar, entregamos siempre un presupuesto claro y detallado.',
    },
    {
      question: '¿Cuánto tiempo dura el proceso de rehabilitación?',
      answer:
        'La rehabilitación completa suele extenderse entre 8 meses y un año. La duración varía según la cicatrización, los controles necesarios y las características clínicas de cada paciente.',
    },
    {
      question: '¿Podré recuperar mi función y apariencia?',
      answer:
        'Nuestro objetivo es restablecer la función oral —habla, masticación y deglución— junto con la estética facial, alcanzando el mejor resultado posible según cada caso.',
    },
    {
      question: '¿Por qué presento sequedad bucal?',
      answer:
        'La sequedad bucal es una consecuencia frecuente de la radioterapia. Evaluamos cada situación y brindamos indicaciones y cuidados específicos para mejorar el confort y proteger la salud oral.',
    },
    {
      question: '¿Por qué los líquidos pasan hacia la nariz?',
      answer:
        'Esto ocurre cuando existe una comunicación entre la cavidad oral y nasal. El uso de un obturador permite sellar esta comunicación y recuperar la función de forma segura.',
    },
    {
      question: '¿Por qué el obturador es necesario para hablar correctamente?',
      answer:
        'El obturador restablece la separación entre boca y cavidad nasal, permitiendo una correcta emisión de la voz. Sin él, la pronunciación y el control del aire se ven afectados.',
    },
  ];

  /** Accordion single + collapsible */
  openIndex: number | null = 0;

  toggle(index: number): void {
    this.openIndex = this.openIndex === index ? null : index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
