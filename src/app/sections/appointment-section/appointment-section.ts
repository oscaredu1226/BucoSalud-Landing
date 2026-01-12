import { Component } from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ToastService} from '../../shared/toast/toast.service';

@Component({
  selector: 'app-appointment-section',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './appointment-section.html',
})
export class AppointmentSection {
  isSubmitting = false;

  form;

  constructor(private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      preferredDate: [''],
      message: [''],
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show({
        title: 'Revisa el formulario',
        description: 'Completa los campos obligatorios antes de enviar.',
      });
      return;
    }

    this.isSubmitting = true;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.toast.show({
      title: 'Solicitud de Cita Recibida',
      description:
        'Nos pondremos en contacto contigo en las próximas 24 horas para confirmar tu consulta.',
    });

    this.form.reset({
      name: '',
      email: '',
      phone: '',
      preferredDate: '',
      message: '',
    });

    this.isSubmitting = false;
  }

  hasError(controlName: string, error: string) {
    const c = this.form.get(controlName);
    return !!(c && c.touched && c.hasError(error));
  }
}
