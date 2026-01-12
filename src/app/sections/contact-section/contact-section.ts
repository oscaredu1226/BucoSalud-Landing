import { Component } from '@angular/core';
type ContactItem = {
  icon: 'mapPin' | 'phone' | 'mail' | 'clock';
  title: string;
  lines: string[];
};
@Component({
  selector: 'app-contact-section',
  imports: [],
  templateUrl: './contact-section.html',
})
export class ContactSection {
  contactInfo: ContactItem[] = [
    {
      icon: 'mapPin',
      title: 'Visítanos',
      lines: ['Av. Insurgentes Sur 1234, Piso 5', 'Col. Del Valle, CDMX 03100'],
    },
    {
      icon: 'phone',
      title: 'Llámanos',
      lines: ['(55) 1234-5678', 'Línea directa: (800) 123-4567'],
    },
    {
      icon: 'mail',
      title: 'Escríbenos',
      lines: ['citas@renovadental.mx', 'info@renovadental.mx'],
    },
    {
      icon: 'clock',
      title: 'Horarios',
      lines: ['Lun-Jue: 8am - 6pm', 'Vie: 8am - 4pm', 'Sáb: Con cita previa'],
    },
  ];

  trackByTitle = (_: number, item: ContactItem) => item.title;
  trackByIndex = (i: number) => i;

}
