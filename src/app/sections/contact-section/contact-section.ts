import { Component } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
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
    // 👇 lo dejo SOLO para cargar horas disponibles (ya no se usa para el landing, pero lo dejo para no romper nada)
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

    // ✅ Cuando cambie la fecha, carga horas DESDE EDGE (landing-availability)
    this.form.controls.date.valueChanges.subscribe(async (date) => {
      this.submitError = null;
      this.submitOk = null;

      this.form.controls.time.setValue('');
      this.availableHours = [];

      if (!date) return;

      try {
        this.isLoadingHours = true;

        const res = await fetch(`${environment.supabaseUrl}/functions/v1/landing-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            tzOffsetMinutes: new Date().getTimezoneOffset(),
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'No se pudo cargar disponibilidad.');

        this.availableHours = data?.availableHours ?? [];
      } catch (e: any) {
        this.availableHours = [];
        this.submitError = e?.message ?? 'No se pudo cargar disponibilidad.';
      } finally {
        this.isLoadingHours = false;
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
  // DISPONIBILIDAD (ESTO YA NO SE USA EN LANDING, lo dejo para no romper nada)
  // =========================
  private async loadAvailableHoursForDate(dateYYYYMMDD: string) {
    this.isLoadingHours = true;

    try {
      const { data: settings, error: sErr } = await this.apptRepo.getAvailabilitySettings();
      if (sErr) throw sErr;

      const slotMinutes = settings?.slot_minutes ?? 60;
      const workingHours = (settings?.working_hours ?? null) as WorkingHours | null;

      if (!workingHours) {
        this.availableHours = [];
        return;
      }

      const key = this.dowKeyFromDate(dateYYYYMMDD);
      const dayCfg = workingHours[key];

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

      const [y, m, d] = dateYYYYMMDD.split('-').map(Number);
      const dayStartLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
      const dayEndLocal = new Date(y, m - 1, d, 23, 59, 59, 999);

      const fromIso = dayStartLocal.toISOString();
      const toIso = dayEndLocal.toISOString();

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

      const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
        return new Date(aStart).getTime() < new Date(bEnd).getTime()
          && new Date(aEnd).getTime() > new Date(bStart).getTime();
      };

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
  // SUBMIT (EDGE FUNCTION)
  // =========================
  async onSubmit() {
    this.submitted = true;
    this.submitError = null;
    this.submitOk = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const v = this.form.getRawValue();

      const payload = {
        first_names: v.name.trim(),
        last_names: v.lastName.trim(),
        dni: v.dni.trim(),
        phone: v.phone.trim(),
        date: v.date,
        time: v.time,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        website: '',
      };

      const res = await fetch(`${environment.supabaseUrl}/functions/v1/landing-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === 'SLOT_TAKEN') throw new Error('Ese horario ya fue reservado. Elige otra hora.');
        if (data?.error === 'SLOT_BLOCKED') throw new Error('Ese horario no está disponible. Elige otra hora.');
        throw new Error(data?.error || 'No se pudo registrar la cita.');
      }

      this.submitError = null;
      this.submitOk = '¡Listo! Tu solicitud de cita fue registrada.';

      setTimeout(() => {
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
      }, 100);

    } catch (e: any) {
      this.submitOk = null;
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
