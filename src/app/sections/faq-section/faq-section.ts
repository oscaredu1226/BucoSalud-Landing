import { Component } from '@angular/core';
type Faq = { question: string; answer: string };


@Component({
  selector: 'app-faq-section',
  imports: [],
  templateUrl: './faq-section.html',
})
export class FaqSection {
  faqs: Faq[] = [
    {
      question:
        '¿Cuánto tiempo después del tratamiento del cáncer puedo comenzar la rehabilitación dental?',
      answer:
        'El tiempo varía según tu tratamiento específico y recuperación. Generalmente, recomendamos esperar al menos 6 meses después de la radioterapia antes de procedimientos de implantes. Sin embargo, los tratamientos no quirúrgicos pueden comenzar antes. Nos coordinaremos con tu oncólogo para determinar el cronograma óptimo para tu situación.',
    },
    {
      question: '¿Es seguro el trabajo dental para sobrevivientes de cáncer?',
      answer:
        'Sí, cuando lo realizan especialistas capacitados en cuidado dental oncológico. Nuestro equipo utiliza protocolos modificados específicamente diseñados para pacientes post-cáncer, incluyendo evaluación cuidadosa de densidad ósea, coordinación con tu equipo médico y protocolos de cicatrización especializados. Tu seguridad es nuestra máxima prioridad.',
    },
    {
      question:
        '¿Funcionarán mis implantes dentales si he recibido radioterapia?',
      answer:
        'Muchos pacientes que han recibido radioterapia son excelentes candidatos para implantes. Aunque la radiación puede afectar la cicatrización ósea, nuestras técnicas especializadas—incluyendo protocolos de oxígeno hiperbárico cuando es necesario—han ayudado a miles de pacientes a recibir implantes exitosamente. Realizaremos evaluaciones exhaustivas para crear un plan personalizado.',
    },
    {
      question:
        '¿Cómo manejan los problemas de boca seca por el tratamiento del cáncer?',
      answer:
        'La xerostomía (boca seca) es común después de la radiación y ciertos medicamentos. Ofrecemos manejo integral incluyendo tratamientos de flúor de alta concentración, sustitutos de saliva, bandejas personalizadas para retención de humedad y monitoreo continuo para prevenir complicaciones. Nuestro objetivo es mantenerte cómodo y proteger tu salud oral.',
    },
    {
      question: '¿Se coordinan con mi equipo de oncología?',
      answer:
        'Absolutamente. El cuidado colaborativo es fundamental en nuestro enfoque. Mantenemos comunicación cercana con tus oncólogos, radioterapeutas y otros proveedores de salud para asegurar que todos los tratamientos sean seguros y oportunos. Solicitaremos los registros necesarios y proporcionaremos actualizaciones detalladas a tu equipo.',
    },
    {
      question: '¿Cuáles son las opciones de pago disponibles?',
      answer:
        'Creemos que las preocupaciones financieras no deben impedir que nadie reciba la atención necesaria. Aceptamos la mayoría de los principales planes de seguro, ofrecemos planes de pago flexibles y podemos ayudar a navegar la cobertura para beneficios médicos vs. dentales. Nuestro equipo trabajará contigo para encontrar una solución accesible.',
    },
  ];

  /** accordion single+collapsible */
  openIndex: number | null = 0; // puedes poner null si quieres todo cerrado al inicio

  toggle(index: number) {
    this.openIndex = this.openIndex === index ? null : index;
  }

  trackByIndex = (i: number) => i;

}
