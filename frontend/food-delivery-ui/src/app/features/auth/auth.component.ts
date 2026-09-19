import { AfterViewInit, Component, ElementRef, NgZone, OnInit, ViewChild, inject, signal } from '@angular/core';
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

      @if (googleEnabled()) {
        <div class="auth-divider"><span>or</span></div>
      }
      <div #googleBtn class="google-signin"></div>
    </section>
  `
})
export class AuthComponent implements OnInit, AfterViewInit {
  private readonly api = inject(FoodDeliveryApi);
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly zone = inject(NgZone);

  @ViewChild('googleBtn') private googleBtn?: ElementRef<HTMLElement>;

  protected readonly screen = signal<AuthScreen>('login');
  protected readonly googleEnabled = signal(false);
  private clientId = '';
  private viewReady = false;

  ngOnInit(): void {
    // The client id is env-driven (served by the backend), so the button only
    // appears when Google sign-in is actually configured.
    this.api.googleConfig().subscribe(cfg => {
      if (cfg.clientId) {
        this.clientId = cfg.clientId;
        this.googleEnabled.set(true);
        this.loadGsiScript().then(() => this.renderGoogleButton());
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.googleEnabled()) this.renderGoogleButton();
  }

  private loadGsiScript(): Promise<void> {
    const g = (window as any).google;
    if (g?.accounts?.id) return Promise.resolve();
    const existing = document.getElementById('google-gsi');
    if (existing) return new Promise(resolve => existing.addEventListener('load', () => resolve()));
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.id = 'google-gsi';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }

  private renderGoogleButton(): void {
    const g = (window as any).google;
    if (!g?.accounts?.id || !this.viewReady || !this.googleBtn) return;
    g.accounts.id.initialize({
      client_id: this.clientId,
      callback: (resp: { credential: string }) => this.onGoogleCredential(resp.credential)
    });
    g.accounts.id.renderButton(this.googleBtn.nativeElement, {
      theme: 'outline', size: 'large', text: 'continue_with', width: 320
    });
  }

  private onGoogleCredential(credential: string): void {
    // GSI's callback fires outside Angular's zone; re-enter so signals update the view.
    this.zone.run(() => {
      this.notifications.clearMessages();
      this.notifications.saving.set(true);
      this.api.googleSignIn(credential)
        .pipe(finalize(() => this.notifications.saving.set(false)))
        .subscribe({
          next: response => this.completeAuth(response),
          error: (e: Error) => this.notifications.error.set(e.message || 'Google sign-in failed.')
        });
    });
  }

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
    if (this.loginForm.invalid) {
      this.notifications.clearMessages();
      this.notifications.error.set('Please enter a valid email and password.');
      this.loginForm.markAllAsTouched();
      return;
    }

    this.notifications.clearMessages();
    this.notifications.saving.set(true);
    this.api.login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: response => this.completeAuth(response),
        error: (e: Error) => this.notifications.error.set(e.message || 'Unable to sign in. Check that the backend services are running.')
      });
  }

  protected register(): void {
    if (this.registerForm.invalid) {
      this.notifications.clearMessages();
      this.notifications.error.set('Please complete all required fields correctly before creating your account.');
      this.registerForm.markAllAsTouched();
      return;
    }

    this.notifications.clearMessages();
    this.notifications.saving.set(true);
    this.api.register(this.registerForm.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: response => this.completeAuth(response),
        error: (e: Error) => this.notifications.error.set(e.message || 'Unable to create the account. Check that the backend services are running.')
      });
  }

  private completeAuth(response: AuthenticationResponse): void {
    this.auth.start(response);
    this.notifications.notice.set(`Welcome, ${response.user.firstName}.`);
    this.router.navigate(['/restaurants']);
  }
}
