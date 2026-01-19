import { Component } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  date: FormControl<string>;
  time: FormControl<string>;
};

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-section.html',
})
export class ContactSection {
  readonly googleMapsUrl = 'https://maps.app.goo.gl/SpEBVrp8LSAiK2Xg6';

  // ✅ Este será el src seguro para el iframe
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

  // ✅ Dropdown de horas (cada 1 hora desde 10:00)
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

  // ✅ TIP para evitar TS2729: inicializar dentro del constructor
  form: FormGroup<ContactForm>;

  constructor(private fb: FormBuilder, private sanitizer: DomSanitizer) {
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

    // ✅ Embed seguro
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
    if (this.form.invalid) return;

    this.isSubmitting = true;

    await new Promise((r) => setTimeout(r, 1000));

    this.form.reset({
      name: '',
      lastName: '',
      dni: '',
      phone: '+51 ',
      date: '',
      time: '',
    });

    this.submitted = false;
    this.isSubmitting = false;
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
