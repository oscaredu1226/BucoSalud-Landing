import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type ContactItem = {
  icon: 'mapPin' | 'phone' | 'mail' | 'clock';
  title: string;
  lines: string[];
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
      lines: ['Lun-Jue: 8am - 6pm', 'Vie: 8am - 4pm', 'Sáb: Con cita previa'],
    },
    {
      icon: 'mapPin',
      title: 'Visítanos',
      lines: ['Av. Insurgentes Sur 1234, Piso 5', 'Col. Del Valle, CDMX 03100'],
    },
  ];

  isSubmitting = false;
  submitted = false;

  form;

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      phone: ['', [Validators.required, Validators.maxLength(20)]],
      message: ['', [Validators.maxLength(1000)]],
    });

    // ✅ Embed sin API key (por query) + sanitizer
    const embed =
      'https://www.google.com/maps?q=' +
      encodeURIComponent('Av. Insurgentes Sur 1234, Piso 5, Col. Del Valle, CDMX 03100') +
      '&output=embed';

    this.googleMapsEmbedSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  get f() {
    return this.form.controls;
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;

    this.isSubmitting = true;
    await new Promise((r) => setTimeout(r, 1000));

    this.form.reset();
    this.submitted = false;
    this.isSubmitting = false;
  }

  trackByTitle(_index: number, item: ContactItem) {
    return item.title;
  }

  trackByIndex(index: number) {
    return index;
  }
}
