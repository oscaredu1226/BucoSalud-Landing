import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-receptionist-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  currentYear = new Date().getFullYear();
  isSubmitting = false;
  submitted = false;

  form;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      remember: [true],
    });
  }

  get f() {
    return this.form.controls;
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;

    this.isSubmitting = true;

    await new Promise((r) => setTimeout(r, 600));

    this.isSubmitting = false;
    this.router.navigateByUrl('/receptionist/dashboard');
  }
}
