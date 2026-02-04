import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren } from '@angular/core';

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
export class ProcessSection implements AfterViewInit {
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

  @ViewChildren('revealText', { read: ElementRef })
  revealTexts!: QueryList<ElementRef<HTMLElement>>;

  @ViewChildren('revealImg', { read: ElementRef })
  revealImgs!: QueryList<ElementRef<HTMLElement>>;

  private io?: IntersectionObserver;

  ngAfterViewInit(): void {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (prefersReduced) return;

    const init = (el: HTMLElement, from: 'left' | 'right', delayMs = 0) => {
      el.classList.add(
        'opacity-0',
        'blur-sm',
        'transition-all',
        'duration-700',
        'ease-out',
        'will-change-transform'
      );

      el.classList.add(from === 'left' ? '-translate-x-6' : 'translate-x-6');

      if (delayMs > 0) el.style.transitionDelay = `${delayMs}ms`;
    };

    this.io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;

          if (!entry.isIntersecting) continue;

          el.classList.remove('opacity-0', 'blur-sm', '-translate-x-6', 'translate-x-6');
          el.classList.add('opacity-100', 'blur-0');

          this.io?.unobserve(el);
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    this.revealTexts.forEach((ref, i) => {
      const el = ref.nativeElement;
      const from = i % 2 === 0 ? 'left' : 'right';
      init(el, from, 0);
      this.io?.observe(el);
    });

    this.revealImgs.forEach((ref, i) => {
      const el = ref.nativeElement;
      const from = i % 2 === 0 ? 'right' : 'left';
      init(el, from, 120);
      this.io?.observe(el);
    });
  }

  scrollToSection(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  firstWord(title: string): string {
    return title.split(' ')[0] ?? title;
  }
}
