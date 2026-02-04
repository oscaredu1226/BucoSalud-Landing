import { Component } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PatientHttpRepository } from '../../receptionist/infrastructure/http/repositories/patient.http-repository';
import { AppointmentHttpRepository } from '../../receptionist/infrastructure/http/repositories/appointment.http-repository';

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

type WorkingHourDay = { start: string; end: string; enabled: boolean };
type WorkingHours = Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', WorkingHourDay>;

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

  // ✅ ahora se carga dinámico por fecha
  availableHours: string[] = [];
  isLoadingHours = false;

  isSubmitting = false;
  submitted = false;

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

    // ✅ Cuando cambie la fecha, recarga horas reales
    this.form.controls.date.valueChanges.subscribe(async (date) => {
      this.submitError = null;
      this.submitOk = null;

      // reset de hora seleccionada y lista
      this.form.controls.time.setValue('');
      this.availableHours = [];

      if (!date) return;

      try {
        await this.loadAvailableHoursForDate(date);
      } catch (e: any) {
        this.availableHours = [];
        this.submitError = e?.message ?? 'No se pudo cargar disponibilidad.';
      }
    });

    const embed =
      'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3901.2771374417725!2d-77.009592!3d-12.0931702!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c7d7d27386e7%3A0x4dadbe5739630df6!2sAv.%20Guardia%20Civil%20482%2C%20San%20Isidro%2015036!5e0!3m2!1ses!2spe!4v1768669955175!5m2!1ses!2spe';

    this.googleMapsEmbedSafeUrl =
      this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  get f() {
    return this.form.controls;
  }

  // =========================
  // helpers working_hours
  // =========================
  private parseHHmm(hhmm: string): { hh: number; mm: number } | null {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const [hh, mm] = hhmm.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hh, mm };
  }

  private dowKeyFromDate(dateIso: string): keyof WorkingHours {
    const d = new Date(dateIso + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun..6=Sat
    const map: (keyof WorkingHours)[] = ['sun','mon','tue','wed','thu','fri','sat'];
    return map[dow];
  }

  // =========================
  // DISPONIBILIDAD (como crear citas)
  // =========================
  private async loadAvailableHoursForDate(dateYYYYMMDD: string) {
    this.isLoadingHours = true;

    try {
      // 1) settings (slot + working_hours)
      const { data: settings, error: sErr } = await this.apptRepo.getAvailabilitySettings();
      if (sErr) throw sErr;

      const slotMinutes = settings?.slot_minutes ?? 60;
      const workingHours = (settings?.working_hours ?? null) as WorkingHours | null;

      // 2) si no hay working_hours, no rompas: queda vacío (o si quieres, fallback)
      if (!workingHours) {
        this.availableHours = [];
        return;
      }

      const key = this.dowKeyFromDate(dateYYYYMMDD);
      const dayCfg = workingHours[key];

      // 3) si el día está deshabilitado => 0 horas
      if (!dayCfg || !dayCfg.enabled) {
        this.availableHours = [];
        return;
      }

      const start = this.parseHHmm(dayCfg.start);
      const end = this.parseHHmm(dayCfg.end);
      if (!start || !end) {
        this.availableHours = [];
        return;
      }

      // 4) rango del día en hora local -> ISO UTC
      const [y, m, d] = dateYYYYMMDD.split('-').map(Number);
      const dayStartLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
      const dayEndLocal = new Date(y, m - 1, d, 23, 59, 59, 999);

      const fromIso = dayStartLocal.toISOString();
      const toIso = dayEndLocal.toISOString();

      // 5) traer citas y bloqueos del día
      const [
        { data: appts, error: aErr },
        { data: blocks, error: bErr },
      ] = await Promise.all([
        this.apptRepo.listByDateRange(fromIso, toIso, 5000),
        this.apptRepo.listBlockedSlotsByRange(fromIso, toIso, 5000),
      ]);

      if (aErr) throw aErr;
      if (bErr) throw bErr;

      const appointments = appts ?? [];
      const blocked = blocks ?? [];

      // 6) generar slots candidatos según working_hours
      const slots: { label: string; startIso: string; endIso: string }[] = [];

      const workStartLocal = new Date(y, m - 1, d, start.hh, start.mm, 0, 0);
      const workEndBoundary = new Date(y, m - 1, d, end.hh, end.mm, 0, 0);

      for (
        let cursor = new Date(workStartLocal);
        ;
        cursor = new Date(cursor.getTime() + slotMinutes * 60_000)
      ) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);

        // ✅ no permitas que el slot termine después del cierre
        if (slotEnd.getTime() > workEndBoundary.getTime()) break;

        const label =
          `${String(slotStart.getHours()).padStart(2, '0')}:` +
          `${String(slotStart.getMinutes()).padStart(2, '0')}`;

        slots.push({
          label,
          startIso: slotStart.toISOString(),
          endIso: slotEnd.toISOString(),
        });
      }

      // 7) overlap helper
      const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
        return new Date(aStart).getTime() < new Date(bEnd).getTime()
          && new Date(aEnd).getTime() > new Date(bStart).getTime();
      };

      // 8) filtrar slots ocupados por citas o bloqueos
      const free = slots.filter((slot) => {
        const occupiedByAppt = appointments.some((r: any) =>
          overlaps(r.start_at, r.end_at, slot.startIso, slot.endIso)
        );
        if (occupiedByAppt) return false;

        const occupiedByBlock = blocked.some((b: any) =>
          overlaps(b.start_at, b.end_at, slot.startIso, slot.endIso)
        );
        return !occupiedByBlock;
      });

      this.availableHours = free.map((s) => s.label);
    } finally {
      this.isLoadingHours = false;
    }
  }

  // =========================
  // SUBMIT (igual que lo tienes)
  // =========================
  async onSubmit() {
    this.submitted = true;
    this.submitError = null;
    this.submitOk = null;

    if (this.form.invalid) return;

    this.isSubmitting = true;

    try {
      const v = this.form.getRawValue();

      const dni = v.dni.trim();
      const first_names = v.name.trim();
      const last_names = v.lastName.trim();
      const phone = v.phone.trim();

      const { data: existing, error: findErr } = await this.patientsRepo.findByDni(dni);
      if (findErr) throw findErr;

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

      const { data: settings, error: sErr } = await this.apptRepo.getAvailabilitySettings();
      if (sErr) throw sErr;
      const slotMinutes = settings?.slot_minutes ?? 60;

      const [y, m, d] = v.date.split('-').map(Number);
      const [hh, mm] = v.time.split(':').map(Number);

      const startLocal = new Date(y, m - 1, d, hh, mm, 0, 0);
      if (Number.isNaN(startLocal.getTime())) {
        throw new Error('Fecha u hora inválida.');
      }

      const endLocal = new Date(startLocal.getTime() + slotMinutes * 60_000);

      const startIso = startLocal.toISOString();
      const endIso = endLocal.toISOString();

      const { data: blocked, error: bErr } = await this.apptRepo.listBlockedSlotsByRange(startIso, endIso, 1);
      if (bErr) throw bErr;
      if ((blocked ?? []).length > 0) {
        this.submitError = 'Ese horario está bloqueado. Elige otra hora.';
        return;
      }

      const { data: overlap, error: oErr } = await this.apptRepo.hasOverlappingAppointment(startIso, endIso);
      if (oErr) throw oErr;
      if (overlap) {
        this.submitError = 'Ese horario ya está reservado. Elige otra hora.';
        return;
      }

      const { data: createdAppt, error: cErr } = await this.apptRepo.create({
        patient_id: patientId,
        start_at: startIso,
        end_at: endIso,
        status: 'confirmed',
        notes: 'Cita solicitada desde landing',
      });

      if (cErr) throw cErr;
      if (!createdAppt?.id) throw new Error('No se pudo crear la cita.');

      this.submitOk = '¡Listo! Tu solicitud de cita fue registrada.';
      this.form.reset({
        name: '',
        lastName: '',
        dni: '',
        phone: '+51 ',
        date: '',
        time: '',
      });
      this.availableHours = [];
      this.submitted = false;
    } catch (e: any) {
      this.submitError = e?.message ?? 'Ocurrió un error al registrar la cita.';
    } finally {
      this.isSubmitting = false;
    }
  }

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
