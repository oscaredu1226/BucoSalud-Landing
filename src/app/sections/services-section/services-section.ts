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
  standalone: true,

})
export class ServicesSection {
  services: Service[] = [
    {
      icon: 'stethoscope',
      title: 'Evaluación Integral Oncológica',
      description:
        'Valoración completa de la cavidad oral en pacientes oncológicos (especialmente cabeza y cuello) para planificar atención antes, durante y después del tratamiento.',
    },
    {
      icon: 'shieldCheck',
      title: 'Rehabilitación Buco Maxilofacial',
      description:
        'Rehabilitación especializada postoperatoria para recuperar función oral, habla, deglución y estética, con protocolos según cada caso.',
    },
    {
      icon: 'smile',
      title: 'Prótesis Fija y Removible',
      description:
        'Prótesis personalizadas y obturadores (cuando corresponde) para restituir función y estética de forma segura y progresiva.',
    },
    {
      icon: 'pill',
      title: 'Endodoncia y Control de Infecciones',
      description:
        'Tratamientos conservadores y endodónticos para eliminar focos infecciosos y preparar la boca, reduciendo riesgos durante el tratamiento oncológico.',
    },
    {
      icon: 'sparkles',
      title: 'Periodoncia y Láser Odontológico',
      description:
        'Manejo de encías y tejidos con técnicas y láser odontológico para favorecer salud oral, confort y cicatrización, según indicación clínica.',
    },
    {
      icon: 'heartHandshake',
      title: 'Controles y Mantenimiento Interdisciplinario',
      description:
        'Seguimiento periódico, ajustes y mantenimiento, coordinado con el equipo tratante. Atención personalizada e interdisciplinaria en todo el proceso.',
    },
  ];

  trackByTitle = (_: number, item: Service) => item.title;

}
