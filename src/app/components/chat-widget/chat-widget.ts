import { Component, ElementRef, ViewChild } from '@angular/core';

type OptionId = 'info' | 'contact' | 'reservations' | 'hours' | 'location';

type Message = {
  id: number;
  text: string;
  isBot: boolean;
  kind?: 'plain' | 'contact';
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
      text: '¡Hola! 👋 Soy tu asistente virtual. ¿Qué información necesitas hoy?',
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
        'Somos un centro especializado en la atención odontológica integral del paciente oncológico, con énfasis en cáncer de cabeza y cuello.\n\n' +
        'Acompañamos desde el primer diagnóstico hasta la rehabilitación definitiva, devolviendo funciones vitales como el habla, la masticación y la deglución, además de la estética facial.\n\n' +
        'Trabajamos de forma interdisciplinaria y personalizada, según cada caso.',
      kind: 'plain',
    },

    contact: {
      kind: 'contact',
      text:
        'Puedes contactarnos a través de:\n\n' +
        '📱 WhatsApp: [TU WHATSAPP]\n' +
        '📞 Teléfono: [TU TELÉFONO]\n' +
        '✉️ Email: [TU EMAIL]\n\n' +
        'Respondemos dentro del horario de atención. Si escribes fuera de horario, te contestaremos en el siguiente turno.',
    },

    hours: {
      text:
        'Nuestro horario de atención es:\n\n' +
        '🗓️ Lunes a viernes: 3:00 p.m. – 8:00 p.m.\n\n' +
        'Si deseas agendar una cita, puedes dejar tu solicitud en “Reservaciones” y te confirmaremos dentro del horario.',
      kind: 'plain',
    },

    location: {
      text:
        'Nos encontramos en:\n\n' +
        '📍 Av. Guardia Civil 482 – San Isidro\n\n' +
        'Si necesitas indicaciones adicionales, escríbenos por “Contacto” y te ayudamos.',
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

    // NO TOCAR: reservaciones (scroll) tal cual lo tienes
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
