import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthSession } from '../../core/auth-session';
import { NotificationService } from '../../core/notification.service';
import { DeliveryApi } from '../../core/delivery-api';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>🚴 Delivery Partner</h1>
        <p class="subtitle">Earn by delivering food</p>

        <div class="tabs">
          <button [class.active]="mode() === 'login'" (click)="mode.set('login')">Login</button>
          <button [class.active]="mode() === 'register'" (click)="mode.set('register')">Register</button>
        </div>

        @if (mode() === 'login') {
          <form (ngSubmit)="login()" class="form">
            <label>Email <input type="email" [(ngModel)]="email" name="email" required /></label>
            <label>Password <input type="password" [(ngModel)]="password" name="password" required /></label>
            <button type="submit" class="btn-primary" [disabled]="loading()">Login</button>
          </form>
        } @else {
          <form (ngSubmit)="register()" class="form">
            <div class="row">
              <label>First Name <input [(ngModel)]="firstName" name="firstName" required /></label>
              <label>Last Name <input [(ngModel)]="lastName" name="lastName" required /></label>
            </div>
            <label>Email <input type="email" [(ngModel)]="email" name="email" required /></label>
            <label>Phone <input [(ngModel)]="phoneNumber" name="phoneNumber" required /></label>
            <label>Password <input type="password" [(ngModel)]="password" name="password" required minlength="8" /></label>
            <button type="submit" class="btn-primary" [disabled]="loading()">Register as Delivery Partner</button>
          </form>
        }

        @if (error(); as err) { <p class="error">{{ err }}</p> }
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5; }
    .auth-card { background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); width: 100%; max-width: 440px; }
    h1 { margin: 0 0 4px; font-size: 24px; color: #1a1a2e; }
    .subtitle { color: #666; margin: 0 0 24px; font-size: 14px; }
    .tabs { display: flex; margin-bottom: 24px; border-bottom: 2px solid #eee; }
    .tabs button { flex: 1; padding: 10px; border: none; background: none; cursor: pointer; font-size: 14px; color: #888; border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .tabs button.active { color: #2ecc71; border-bottom-color: #2ecc71; }
    .form { display: flex; flex-direction: column; gap: 16px; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #555; }
    input { padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
    input:focus { border-color: #2ecc71; }
    .row { display: flex; gap: 12px; }
    .row label { flex: 1; }
    .btn-primary { padding: 12px; background: #2ecc71; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.6; }
    .error { color: #e74c3c; font-size: 13px; margin: 8px 0 0; }
  `]
})
export class AuthComponent {
  private readonly api = inject(DeliveryApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  firstName = ''; lastName = ''; email = ''; phoneNumber = ''; password = '';

  login(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: response => {
        if (response.user.role !== 'DELIVERY_PARTNER') {
          this.error.set('This app is for delivery partners only');
          this.loading.set(false);
          return;
        }
        this.session.start(response);
        this.router.navigate(['/']);
      },
      error: err => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  register(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api.register({
      firstName: this.firstName, lastName: this.lastName, email: this.email,
      phoneNumber: this.phoneNumber, password: this.password, role: 'DELIVERY_PARTNER'
    }).subscribe({
      next: response => {
        this.session.start(response);
        this.notify.show('Welcome! Start accepting deliveries.');
        this.router.navigate(['/']);
      },
      error: err => { this.error.set(err.message); this.loading.set(false); }
    });
  }
}
