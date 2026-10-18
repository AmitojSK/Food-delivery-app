import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSession } from '../../core/auth-session';
import { NotificationService } from '../../core/notification.service';
import { AuthenticationResponse } from '../../core/models';

/**
 * Lands the browser after an OAuth2 sign-in. On success the backend puts the auth payload
 * (same shape as /login) in the URL fragment as base64url JSON (#data=...); on failure it sets
 * ?error=<base64url message>. We decode, start the session (or surface the error), and route on.
 * Using the fragment keeps the token out of logs/Referer. The URL is cleared immediately.
 */
@Component({
  selector: 'app-oauth-callback',
  template: `<section class="auth-card"><p class="muted">Finishing sign-in…</p></section>`
})
export class OAuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  ngOnInit(): void {
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const data = hashParams.get('data');
    const error = new URLSearchParams(window.location.search).get('error');

    // Scrub the token/error from the address bar so it isn't left in history.
    history.replaceState(null, '', window.location.pathname);

    if (data) {
      try {
        const response = JSON.parse(decodeBase64Url(data)) as AuthenticationResponse;
        if (response?.accessToken && response.user) {
          this.auth.start(response);
          this.notifications.notice.set(`Welcome, ${response.user.firstName}.`);
          this.router.navigate(['/restaurants']);
          return;
        }
      } catch {
        // fall through to the error path
      }
    }

    this.notifications.error.set(error ? decodeBase64Url(error) : 'Sign-in was not completed.');
    this.router.navigate(['/auth']);
  }
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
