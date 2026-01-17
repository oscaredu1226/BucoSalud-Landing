import {Component, ElementRef, ViewChild} from '@angular/core';
type OptionId = 'info' | 'contact' | 'reservations' | 'hours' | 'location';

type Message = {
  id: number;
  text: string;
  isBot: boolean;
  kind?: 'plain' | 'contact'; // para poder renderizar link en "contact"
};
@Component({
  selector: 'app-chat-widget',
  imports: [],
  templateUrl: './chat-widget.html',
})
export class ChatWidget {
  isOpen = false;

  messages: Message[] = [
    {
      id: 0,
      text: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      isBot: true,
      kind: 'plain',
    },
  ];

  predefinedOptions = [
    { id: 'info' as const, label: 'Información' },
    { id: 'contact' as const, label: 'Contacto' },
    { id: 'reservations' as const, label: 'Reservaciones' },
    { id: 'hours' as const, label: 'Horarios' },
    { id: 'location' as const, label: 'Ubicación' },
  ];

  private predefinedResponses: Record<OptionId, { text: string; kind?: Message['kind'] }> = {
    info: {
      text:
        'Ofrecemos un servicio personalizado según lo que necesites. El proceso habitual es simple: elige tu servicio, reserva una fecha disponible y recibe una confirmación. Si tienes un objetivo específico (cita, consulta, servicio o evento), te guiaremos paso a paso para que puedas completar todo de manera rápida y sencilla.',
      kind: 'plain',
    },
    contact: {
      kind: 'contact',
      text:
        'Puedes contactarnos a través de:\n\n' +
        '📱 WhatsApp: +1 999 999 9999\n' +
        '📞 Teléfono: (555) 555-5555\n' +
        '✉️ Email: contacto@tudominio.com\n\n' +
        'El tiempo de respuesta típico es entre 5 y 30 minutos durante el horario de atención.',
    },
    hours: {
      text:
        'Nuestro horario de atención es:\n\n' +
        '🗓️ Lunes a Viernes: 9:00 AM – 7:00 PM\n' +
        '🗓️ Sábado: 9:00 AM – 1:00 PM\n' +
        '🗓️ Domingo y festivos: Cerrado\n\n' +
        'Puedes reservar fuera del horario de atención y confirmaremos tu solicitud el siguiente día hábil.',
      kind: 'plain',
    },
    location: {
      text:
        'Estamos ubicados en:\n' +
        '📍 Avenida Ejemplo 123, Centro.\n' +
        'Referencia: A una cuadra del Parque Central.\n' +
        'Si llegas en auto, usualmente hay estacionamiento disponible en la calle.',
      kind: 'plain',
    },
    reservations: {
      text: 'Perfecto ✅ Te llevaré a la sección de reservaciones para que puedas agendar tu cita ahora.',
      kind: 'plain',
    },
  };

  @ViewChild('messagesEnd') messagesEnd!: ElementRef<HTMLDivElement>;

  toggleOpen() {
    this.isOpen = !this.isOpen;
    this.scrollToBottomSoon();
  }

  close() {
    this.isOpen = false;
  }

  handleOptionClick(optionId: OptionId, label: string) {
    const now = Date.now();

    const userMessage: Message = { id: now, text: label, isBot: false, kind: 'plain' };
    const bot = this.predefinedResponses[optionId];
    const botMessage: Message = { id: now + 1, text: bot.text, isBot: true, kind: bot.kind ?? 'plain' };

    this.messages = [...this.messages, userMessage, botMessage];
    this.scrollToBottomSoon();

    if (optionId === 'reservations') {
      setTimeout(() => {
        const reservationsSection =
          document.getElementById('contacto') ||
          document.getElementById('booking') ||
          document.getElementById('cita') ||
          document.querySelector('[id*="reserv"]') ||
          document.querySelector('[id*="cita"]') ||
          document.querySelector('[id*="appointment"]');

        if (reservationsSection) {
          reservationsSection.scrollIntoView({ behavior: 'smooth' });
          this.close();
        }
      }, 1500);
    }
  }

  private scrollToBottomSoon() {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }

  trackById = (_: number, m: Message) => m.id;

}
