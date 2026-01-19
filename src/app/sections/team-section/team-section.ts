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
      name: 'Dra. María Rosario Soto Caminada',
      role: 'Especialista en Rehabilitación Oral',
      expertise: 'Prótesis buco maxilofacial',
      bio: 'Magíster en Geriatría y Gerontología. Docente universitaria y miembro de la Sociedad Latinoamericana de Prótesis Buco Maxilo Facial. Responsable de la planificación y ejecución de rehabilitaciones maxilofaciales.',
      initials: 'MR',
    },
    {
      name: 'Dra. María Angélica Sánez Romero',
      role: 'Especialista en Rehabilitación Oral',
      expertise: 'Rehabilitación funcional y estética oncológica',
      bio: 'Magíster en Estomatología. Docente universitaria y miembro de la Sociedad Latinoamericana de Prótesis Buco Maxilo Facial. Especialista en rehabilitación del paciente oncológico.',
      initials: 'MA',
    },
    {
      name: 'Dra. Úrsula Tineo Valencia',
      role: 'Especialista en Rehabilitación Oral',
      expertise: 'Seguimiento clínico y láser odontológico',
      bio: 'Magíster en Docencia e Investigación. Docente universitaria. Encargada del seguimiento clínico, controles, educación del paciente y aplicación de láser según requerimiento.',
      initials: 'UT',
    },
  ];

  trackByName = (_: number, m: TeamMember) => m.name;
}
