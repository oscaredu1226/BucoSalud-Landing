import { Component } from '@angular/core';

type TeamMember = {
  name: string;
  role: string;
  expertise: string;
  bio: string;
  initials: string;
};

@Component({
  selector: 'app-team-section',
  imports: [],
  templateUrl: './team-section.html',
})
export class TeamSection {
  team: TeamMember[] = [
    {
      name: 'Dra. Elena Vásquez',
      role: 'Fundadora y Prostodoncista Principal',
      expertise: 'Prótesis Maxilofaciales, Rehabilitación con Implantes',
      bio: 'Prostodoncista certificada con 18 años especializándose en reconstrucción dental relacionada con oncología.',
      initials: 'EV',
    },
    {
      name: 'Dr. Miguel Rodríguez',
      role: 'Cirujano Oral',
      expertise: 'Cirugía de Implantes, Injerto Óseo',
      bio: 'Especialista en cirugías orales complejas para pacientes con estructura ósea comprometida por radioterapia.',
      initials: 'MR',
    },
    {
      name: 'Dra. Sara Martínez',
      role: 'Periodoncista',
      expertise: 'Salud de Encías, Manejo de Tejidos Blandos',
      bio: 'Experta en manejar desafíos de salud periodontal únicos para sobrevivientes de cáncer y pacientes post-radiación.',
      initials: 'SM',
    },
    {
      name: 'María Fernanda López',
      role: 'Higienista Principal',
      expertise: 'Cuidado Dental Oncológico, Manejo de Xerostomía',
      bio: 'Higienista dental oncológica certificada dedicada al cuidado preventivo suave y minucioso.',
      initials: 'ML',
    },
  ];

  trackByName = (_: number, m: TeamMember) => m.name;

}
