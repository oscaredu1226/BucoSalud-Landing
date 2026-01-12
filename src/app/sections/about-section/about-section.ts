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
  values: ValueItem[] = [
    {
      icon: 'heart',
      title: 'Compasión Primero',
      description:
        'Entendemos el viaje emocional de los sobrevivientes de cáncer. Cada interacción está guiada por empatía y cuidado genuino.',
    },
    {
      icon: 'shield',
      title: 'Experiencia Especializada',
      description:
        'Nuestro equipo tiene formación dedicada en cuidado dental oncológico, asegurando protocolos de tratamiento seguros y efectivos.',
    },
    {
      icon: 'users',
      title: 'Cuidado Colaborativo',
      description:
        'Trabajamos en estrecha colaboración con oncólogos y proveedores de salud para brindar rehabilitación coordinada e integral.',
    },
    {
      icon: 'award',
      title: 'Excelencia en Atención',
      description:
        'Tecnología de vanguardia combinada con atención personalizada para el más alto estándar de rehabilitación dental.',
    },
  ];

  trackByTitle = (_: number, item: ValueItem) => item.title;

}
