import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../infrastructure/supabase/auth.service';

type LoginForm = {
  email: FormControl<string>;
  password: FormControl<string>;
  remember: FormControl<boolean>;
};

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
  errorMsg = '';

  form: FormGroup<LoginForm>;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(255)]),
      password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]),
      remember: this.fb.nonNullable.control(true),
    });
  }

  get f() {
    return this.form.controls;
  }

  async onSubmit() {
    this.submitted = true;
    this.errorMsg = '';
    if (this.form.invalid) return;

    this.isSubmitting = true;

    const email = this.form.controls.email.value.trim();
    const password = this.form.controls.password.value;

    const { data, error } = await this.auth.signIn(email, password);

    this.isSubmitting = false;

    if (error) {
      this.errorMsg = error.message;
      return;
    }

    if (data?.session?.access_token) {
      await this.router.navigateByUrl('/receptionist/dashboard');
      return;
    }

    this.errorMsg = 'Login failed. Please try again.';
  }
}
