import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, timeout } from 'rxjs';

type WarmStatus = 'idle' | 'warming' | 'ready';

interface WarmSummary {
  ok?: number;
  total?: number;
}

// Always-on Cloudflare Worker (see warm-worker/) that wakes every Render service SERVER-SIDE in one
// call — no CORS, no per-IP request volume from the browser, and no "wake the gateway first"
// chicken-and-egg (the Worker never sleeps). If this URL ever changes, update it here.
const WARM_WORKER_URL = 'https://food-delivery-warm.amitojsk.workers.dev';

/**
 * Wakes the free-tier backends on demand (they spin down after ~15 min idle) with ONE call to the
 * always-on warmer Worker, which triggers every service's boot server-side (the gateway included).
 *
 * The Worker returns a quick snapshot (`ok`/`total`) — slow services are still "waking" and keep
 * booting after it responds; callers (the browse page's recovery loop) wait out the ~90s boot and
 * self-heal. This replaces the old in-app approach of probing six health endpoints through the
 * gateway from the browser, which generated the request volume that tripped Render's edge throttle.
 */
@Injectable({ providedIn: 'root' })
export class WarmUpService {
  private readonly http = inject(HttpClient);

  readonly status = signal<WarmStatus>('idle');
  readonly ready = signal(0);
  readonly total = signal(0);

  warmUp(): Observable<boolean> {
    if (this.status() === 'warming') {
      return of(false);
    }
    this.status.set('warming');
    this.ready.set(0);
    this.total.set(0);
    return this.http.get<WarmSummary>(WARM_WORKER_URL).pipe(
      timeout(30000),
      map(summary => {
        if (typeof summary.total === 'number') this.total.set(summary.total);
        if (typeof summary.ok === 'number') this.ready.set(summary.ok);
        return true;
      }),
      // Even if the warmer errors/times out, the pings it fired already triggered the boots — non-fatal.
      catchError(() => of(true)),
      finalize(() => this.status.set('ready'))
    );
  }
}
