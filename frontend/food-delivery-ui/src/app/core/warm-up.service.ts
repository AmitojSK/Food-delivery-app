import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, map, of, retry, timeout, timer } from 'rxjs';

type WarmStatus = 'idle' | 'warming' | 'ready';

/**
 * Wakes the free-tier backends on demand (they spin down after ~15 min idle). Probes each
 * service's health endpoint through the gateway (same-origin via the nginx proxy, so no CORS);
 * hitting any of these also wakes the gateway itself. A cold instance answers with a gateway
 * 502/503 until it boots, so each probe retries until it gets a real response or the budget runs
 * out. This replaces having to run scripts/warm-up from a terminal.
 */
@Injectable({ providedIn: 'root' })
export class WarmUpService {
  private readonly http = inject(HttpClient);

  readonly status = signal<WarmStatus>('idle');
  readonly ready = signal(0);
  readonly total = signal(0);

  private readonly targets = [
    '/user-api/actuator/health',
    '/restaurant-api/actuator/health',
    '/catalogue-api/actuator/health',
    '/order-api/actuator/health',
    '/delivery-api/actuator/health',
    '/realtime-api/actuator/health'
  ];

  warmUp(): Observable<boolean> {
    if (this.status() === 'warming') {
      return of(false);
    }
    this.status.set('warming');
    this.ready.set(0);
    this.total.set(this.targets.length);

    const probes = this.targets.map(url =>
      this.http.get(url, { responseType: 'text' }).pipe(
        timeout(20000),
        retry({ count: 20, delay: error => this.retryWhileCold(error) }),
        // Any HTTP response (200, or the gateway's 401 for a secured path) means the service is
        // up; only a gateway 5xx / no-connection / timeout is "still cold" and keeps retrying.
        catchError(() => of(null)),
        finalize(() => this.ready.update(count => count + 1))
      )
    );

    return forkJoin(probes).pipe(
      map(() => true),
      finalize(() => this.status.set('ready'))
    );
  }

  // Retry (after 5s) only while the instance is unreachable through the gateway: a 502/503/504,
  // no connection (status 0), or our per-attempt timeout. A real HTTP status — including the
  // gateway's 401 on a secured health path — means it's awake, so we stop and treat it as done.
  private retryWhileCold(error: unknown): Observable<number> {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    const timedOut = (error as { name?: string })?.name === 'TimeoutError';
    if (timedOut || status === 0 || status === 502 || status === 503 || status === 504) {
      return timer(5000);
    }
    throw error;
  }
}
