import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthSession } from '../../core/auth-session';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { NotificationService } from '../../core/notification.service';
import { AuthenticationResponse } from '../../core/models';

type AuthScreen = 'login' | 'register';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule],
  template: `
    <section class="auth-card">
      <div>
        <p class="eyebrow">Your account</p>
        <h2>{{ screen() === 'login' ? 'Welcome back' : 'Create your account' }}</h2>
        <p class="muted">Sign in to place orders and manage your profile.</p>
      </div>

      <div class="auth-tabs">
        <button class="secondary" type="button" [class.active]="screen() === 'login'" (click)="screen.set('login')">Sign in</button>
        <button class="secondary" type="button" [class.active]="screen() === 'register'" (click)="screen.set('register')">Register</button>
      </div>

      @if (screen() === 'login') {
        <form class="auth-form" [formGroup]="loginForm" (ngSubmit)="login()">
          <label>Email<input type="email" formControlName="email" autocomplete="email" /></label>
          <label>Password<input type="password" formControlName="password" autocomplete="current-password" /></label>
          <button type="submit" [disabled]="notifications.saving()">Sign in</button>
        </form>
      } @else {
        <form class="auth-form" [formGroup]="registerForm" (ngSubmit)="register()">
          <label>First name<input type="text" formControlName="firstName" autocomplete="given-name" /></label>
          <label>Last name<input type="text" formControlName="lastName" autocomplete="family-name" /></label>
          <label>Email<input type="email" formControlName="email" autocomplete="email" /></label>
          <label>Phone<input type="tel" formControlName="phoneNumber" autocomplete="tel" /></label>
          <label>Password<input type="password" formControlName="password" autocomplete="new-password" /></label>
          <button type="submit" [disabled]="notifications.saving()">Create account</button>
        </form>
      }
    </section>
  `
})
export class AuthComponent {
  private readonly api = inject(FoodDeliveryApi);
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly screen = signal<AuthScreen>('login');

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected readonly registerForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
  });

  protected login(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.notifications.saving.set(true);
    this.notifications.error.set('');
    this.api.login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: response => this.completeAuth(response),
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }

  protected register(): void {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.notifications.saving.set(true);
    this.notifications.error.set('');
    this.api.register(this.registerForm.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: response => this.completeAuth(response),
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }

  private completeAuth(response: AuthenticationResponse): void {
    this.auth.start(response);
    this.notifications.notice.set(`Welcome, ${response.user.firstName}.`);
    this.router.navigate(['/restaurants']);
  }
}
