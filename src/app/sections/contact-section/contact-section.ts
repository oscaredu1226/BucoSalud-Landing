import { Component } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {PatientHttpRepository} from '../../receptionist/infrastructure/http/repositories/patient.http-repository';
import {
  AppointmentHttpRepository
} from '../../receptionist/infrastructure/http/repositories/appointment.http-repository';


type ContactItem = {
  icon: 'mapPin' | 'phone' | 'mail' | 'clock';
  title: string;
  lines: string[];
};

type ContactForm = {
  name: FormControl<string>;
  lastName: FormControl<string>;
  dni: FormControl<string>;
  phone: FormControl<string>;
  date: FormControl<string>; // YYYY-MM-DD
  time: FormControl<string>; // HH:mm
};

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-section.html',
})
export class ContactSection {
  readonly googleMapsUrl = 'https://maps.app.goo.gl/SpEBVrp8LSAiK2Xg6';
  readonly googleMapsEmbedSafeUrl: SafeResourceUrl;

  contactInfo: ContactItem[] = [
    {
      icon: 'phone',
      title: 'Llámanos',
      lines: ['(55) 1234-5678', 'Línea directa: (800) 123-4567'],
    },
    {
      icon: 'clock',
      title: 'Horarios',
      lines: ['Lun-Jue: 3pm - 8pm'],
    },
    {
      icon: 'mapPin',
      title: 'Visítanos',
      lines: ['Av. Guardia Civil 482', 'San Isidro 15036, Lima - Perú'],
    },
  ];

  availableHours: string[] = [
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  isSubmitting = false;
  submitted = false;

  // Mensajes (si quieres mostrarlos en el HTML)
  submitError: string | null = null;
  submitOk: string | null = null;

  form: FormGroup<ContactForm>;

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private readonly patientsRepo: PatientHttpRepository,
    private readonly apptRepo: AppointmentHttpRepository
  ) {
    this.form = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(60),
      ]),
      lastName: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(60),
      ]),
      dni: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.pattern(/^\d{8}$/),
      ]),
      phone: this.fb.nonNullable.control('+51 ', [
        Validators.required,
        Validators.pattern(/^\+51\s?\d{9}$/),
      ]),
      date: this.fb.nonNullable.control('', [Validators.required]),
      time: this.fb.nonNullable.control('', [Validators.required]),
    });

    const embed =
      'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3901.2771374417725!2d-77.009592!3d-12.0931702!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c7d7d27386e7%3A0x4dadbe5739630df6!2sAv.%20Guardia%20Civil%20482%2C%20San%20Isidro%2015036!5e0!3m2!1ses!2spe!4v1768669955175!5m2!1ses!2spe';

    this.googleMapsEmbedSafeUrl =
      this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  get f() {
    return this.form.controls;
  }

  async onSubmit() {
    this.submitted = true;
    this.submitError = null;
    this.submitOk = null;

    if (this.form.invalid) return;

    this.isSubmitting = true;

    try {
      const v = this.form.getRawValue();

      // 1) Normalizar inputs
      const dni = v.dni.trim();
      const first_names = v.name.trim();
      const last_names = v.lastName.trim();
      const phone = v.phone.trim();

      // 2) Buscar paciente por DNI
      const { data: existing, error: findErr } = await this.patientsRepo.findByDni(dni);
      if (findErr) throw findErr;

      // 3) Si no existe, crear paciente
      let patientId: string;
      if (existing?.id) {
        patientId = existing.id;
      } else {
        const { data: created, error: createErr } = await this.patientsRepo.create({
          first_names,
          last_names,
          dni,
          phone,
          email: null,
          notes: 'Creado desde landing',
        });

        if (createErr) throw createErr;
        if (!created?.id) throw new Error('No se pudo crear el paciente.');

        patientId = created.id;
      }

      // 4) Duración del slot (usa availability_settings si existe; si no, 60)
      const { data: settings, error: sErr } = await this.apptRepo.getAvailabilitySettings();
      if (sErr) throw sErr;

      const slotMinutes = settings?.slot_minutes ?? 60;

      // 5) Construir start_at/end_at en hora local y convertir a ISO UTC (timestamptz)
      const [y, m, d] = v.date.split('-').map(Number);
      const [hh, mm] = v.time.split(':').map(Number);

      const startLocal = new Date(y, m - 1, d, hh, mm, 0, 0);
      if (Number.isNaN(startLocal.getTime())) {
        throw new Error('Fecha u hora inválida.');
      }

      const endLocal = new Date(startLocal.getTime() + slotMinutes * 60_000);

      const startIso = startLocal.toISOString();
      const endIso = endLocal.toISOString();

      // 6) Validar bloqueos (blocked_slots)
      const { data: blocked, error: bErr } = await this.apptRepo.listBlockedSlotsByRange(startIso, endIso, 1);
      if (bErr) throw bErr;

      if ((blocked ?? []).length > 0) {
        this.submitError = 'Ese horario está bloqueado. Elige otra hora.';
        return;
      }

      // 7) Validar choques con citas (appointments)
      const { data: overlap, error: oErr } = await this.apptRepo.hasOverlappingAppointment(startIso, endIso);
      if (oErr) throw oErr;

      if (overlap) {
        this.submitError = 'Ese horario ya está reservado. Elige otra hora.';
        return;
      }

      // 8) Crear cita
      const { data: createdAppt, error: cErr } = await this.apptRepo.create({
        patient_id: patientId,
        start_at: startIso,
        end_at: endIso,
        status: 'confirmed',
        notes: 'Cita solicitada desde landing',
      });

      if (cErr) throw cErr;
      if (!createdAppt?.id) throw new Error('No se pudo crear la cita.');

      // OK
      this.submitOk = '¡Listo! Tu solicitud de cita fue registrada.';
      this.form.reset({
        name: '',
        lastName: '',
        dni: '',
        phone: '+51 ',
        date: '',
        time: '',
      });
      this.submitted = false;
    } catch (e: any) {
      this.submitError = e?.message ?? 'Ocurrió un error al registrar la cita.';
    } finally {
      this.isSubmitting = false;
    }
  }

  // opcional: si quieres forzar que no borren el +51
  onPhoneInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.value.startsWith('+51')) {
      input.value = '+51 ';
      this.form.controls.phone.setValue('+51 ');
    }
  }

  trackByTitle(_index: number, item: ContactItem) {
    return item.title;
  }

  trackByIndex(index: number) {
    return index;
  }
}
