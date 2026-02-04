import { Component } from '@angular/core';

type TeamMember = {
  name: string;
  role: string;
  expertise: string;
  bio: string;
  photo: string; // ruta a la imagen en /public/assets/...
};

@Component({
  selector: 'app-team-section',
  standalone: true,
  templateUrl: './team-section.html',
})
export class TeamSection {
  flipped = new Set<string>();

  team: TeamMember[] = [
    {
      name: 'Dra. María Rosario Soto Caminada',
      role: 'Especialista en Rehabilitación Oral',
      expertise: 'Prótesis buco maxilofacial',
      bio: 'Magíster en Geriatría y Gerontología. Docente universitaria y miembro de la Sociedad Latinoamericana de Prótesis Buco Maxilo Facial. Responsable de la planificación y ejecución de rehabilitaciones maxilofaciales.',
      photo: 'assets/team/prueba.png',
    },
    {
      name: 'Dra. María Angélica Sánez Romero',
      role: 'Especialista en Rehabilitación Oral',
      expertise: 'Rehabilitación funcional y estética oncológica',
      bio: 'Magíster en Estomatología. Docente universitaria y miembro de la Sociedad Latinoamericana de Prótesis Buco Maxilo Facial. Especialista en rehabilitación del paciente oncológico.',
      photo: 'assets/team/prueba.png',
    },
    {
      name: 'Dra. Úrsula Tineo Valencia',
      role: 'Especialista en Rehabilitación Oral',
      expertise: 'Seguimiento clínico y láser odontológico',
      bio: 'Magíster en Docencia e Investigación. Docente universitaria. Encargada del seguimiento clínico, controles, educación del paciente y aplicación de láser según requerimiento.',
      photo: 'assets/team/prueba.png',
    },
  ];

  trackByName = (_: number, m: TeamMember) => m.name;

  isFlipped(member: TeamMember) {
    return this.flipped.has(member.name);
  }

  toggle(member: TeamMember) {
    if (this.flipped.has(member.name)) this.flipped.delete(member.name);
    else this.flipped.add(member.name);
  }
}
