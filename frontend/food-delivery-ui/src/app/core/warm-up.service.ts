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

  // Keep probing a waking service for up to this long before giving up. A fully-cold free-tier stack
  // (the gateway AND a backend both asleep) can take ~2 min to come up, so the budget is generous.
  private static readonly WARM_BUDGET_MS = 3 * 60 * 1000;

  warmUp(): Observable<boolean> {
    if (this.status() === 'warming') {
      return of(false);
    }
    this.status.set('warming');
    this.ready.set(0);
    this.total.set(this.targets.length);
    const deadline = Date.now() + WarmUpService.WARM_BUDGET_MS;

    const probes = this.targets.map(url =>
      this.http.get(url, { responseType: 'text' }).pipe(
        timeout(20000),
        // Retry every ~5s until the service answers 2xx or the ~3 min budget runs out. `count` is
        // just a high safety cap — the wall-clock deadline is the real limit, so persistence is the
        // same whether a cold service fast-fails (instant edge 429) or hangs (per-attempt timeout).
        retry({ count: 60, delay: error => this.retryWhileNotReady(error, deadline) }),
        catchError(() => of(null)),
        finalize(() => this.ready.update(count => count + 1))
      )
    );

    return forkJoin(probes).pipe(
      map(() => true),
      finalize(() => this.status.set('ready'))
    );
  }

  // A 2xx completes the probe (awake). Retry (after 5s, until the ~3 min budget is spent) on anything
  // that means "not ready": the gateway's 401 (health not public yet / refused), a 429 (Render's edge
  // rate-limits requests to a hibernating service while it wakes — `x-render-routing:
  // hibernate-rate-limited`), a 5xx, no connection (status 0), or a per-attempt timeout. Retrying the
  // 429 is what lets this wake a cold GATEWAY: those requests are throttled at the edge before reaching
  // the app, so we must keep poking until it boots. Any other status (e.g. 404), or an exhausted
  // budget, stops — retrying would never succeed or we've waited long enough.
  private retryWhileNotReady(error: unknown, deadline: number): Observable<number> {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    const timedOut = (error as { name?: string })?.name === 'TimeoutError';
    const notReady = timedOut || status === 0 || status === 401 || status === 429
        || status === 502 || status === 503 || status === 504;
    if (notReady && Date.now() < deadline) {
      return timer(5000);
    }
    throw error;
  }
}
