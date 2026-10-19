import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthSession } from '../../core/auth-session';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { NotificationService } from '../../core/notification.service';
import { WarmUpService } from '../../core/warm-up.service';
import { AuthenticationResponse, OAuth2Provider } from '../../core/models';

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

      @if (providers().length || providerState() === 'error') {
        <div class="auth-divider"><span>or</span></div>
      }

      @if (providerState() === 'error') {
        <p class="provider-note">
          {{ providerError() }}
          <button class="warmup-link" type="button" (click)="reloadProviders()" [disabled]="providerState() === 'loading'">Retry</button>
        </p>
      }

      @if (providers().length) {
        <div class="oauth-buttons">
          @for (provider of providers(); track provider.id) {
            <button class="oauth-button" type="button" (click)="startOAuth(provider.id)">
              <span class="oauth-icon">
                @switch (provider.id) {
                  @case ('google') {
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  }
                  @case ('github') {
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5z"/>
                    </svg>
                  }
                }
              </span>
              Continue with {{ provider.name }}
            </button>
          }
        </div>
      }

      <div class="warmup">
        @if (warmUp.status() === 'warming') {
          <button class="warmup-link" type="button" disabled>Waking services… {{ warmUp.ready() }}/{{ warmUp.total() }}</button>
          <p class="warmup-hint muted">Free-tier services sleep when idle; waking can take up to a minute.</p>
        } @else if (warmUp.status() === 'ready') {
          <!-- Don't claim "awake" when a provider fetch is erroring (e.g. rate-limited) — the
               provider message above already explains what to do. -->
          @if (providerState() !== 'error') {
            <span class="warmup-ready">✓ Services are awake</span>
          }
        } @else {
          <button class="warmup-link" type="button" (click)="wake()">Services asleep? Wake them</button>
          <p class="warmup-hint muted">Free-tier services sleep when idle; waking can take up to a minute.</p>
        }
      </div>
    </section>
  `
})
export class AuthComponent implements OnInit {
  private readonly api = inject(FoodDeliveryApi);
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly notifications = inject(NotificationService);
  protected readonly warmUp = inject(WarmUpService);
  private readonly fb = inject(FormBuilder);

  protected readonly screen = signal<AuthScreen>('login');
  protected readonly providers = signal<OAuth2Provider[]>([]);
  protected readonly providerState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly providerError = signal('');

  ngOnInit(): void {
    this.loadProviders();
  }

  // Only providers configured on the backend are returned, so a button appears only when its
  // provider is actually set up. On failure we surface a status-specific message (rather than
  // silently hiding the options) so the user knows whether to wait, warm up, or retry.
  private loadProviders(): void {
    this.providerState.set('loading');
    this.api.oauth2Providers().subscribe({
      next: providers => {
        this.providers.set(providers);
        this.providerState.set('ready');
      },
      error: (error: HttpErrorResponse) => {
        this.providers.set([]);
        this.providerError.set(this.describeProviderError(error));
        this.providerState.set('error');
      }
    });
  }

  protected reloadProviders(): void {
    this.loadProviders();
  }

  private describeProviderError(error: HttpErrorResponse): string {
    if (error.status === 429) {
      return 'Too many requests right now. Wait a few seconds, then retry.';
    }
    if (error.status === 0 || error.status >= 500) {
      return 'Sign-in options are waking up. Tap “Wake services”, then retry.';
    }
    return 'Social sign-in is temporarily unavailable.';
  }

  // Wakes the sleeping free-tier backends, then re-checks providers so the social
  // buttons appear without a manual reload once the backend is up.
  protected wake(): void {
    this.warmUp.warmUp().subscribe(() => this.loadProviders());
  }

  // Full-page navigation to the backend's OAuth2 authorization endpoint (same origin,
  // via the nginx /user-api proxy), which redirects on to the provider.
  protected startOAuth(providerId: string): void {
    window.location.href = `/user-api/oauth2/authorization/${providerId}`;
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
