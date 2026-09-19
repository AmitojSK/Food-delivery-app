import { Injectable, inject, signal } from '@angular/core';
import { AuthSession } from './auth-session';

/**
 * Live order-status stream from the notification-service, over Server-Sent Events.
 *
 * We consume the stream with `fetch` rather than the native `EventSource` because
 * EventSource cannot send an Authorization header, and we will not put the JWT in
 * the URL. The connection reconnects with capped backoff while a session is active.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStream {
  private readonly auth = inject(AuthSession);
  private controller: AbortController | null = null;
  private running = false;
  private retryMs = 2000;

  /** orderId -> latest status seen on the stream. */
  readonly statuses = signal<Record<string, string>>({});

  statusFor(orderId: string | null | undefined): string | null {
    return orderId ? (this.statuses()[orderId] ?? null) : null;
  }

  connect(): void {
    if (this.running) return;
    const token = this.auth.accessToken();
    if (!token) return;
    this.running = true;
    void this.loop(token);
  }

  disconnect(): void {
    this.running = false;
    this.controller?.abort();
    this.controller = null;
  }

  private async loop(token: string): Promise<void> {
    while (this.running) {
      this.controller = new AbortController();
      try {
        const response = await fetch('/notification-api/api/v1/notifications/stream', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: this.controller.signal
        });
        if (!response.ok || !response.body) throw new Error(`stream ${response.status}`);
        this.retryMs = 2000;
        await this.read(response.body.getReader());
      } catch {
        if (!this.running) return;
      }
      if (!this.running) return;
      await this.delay(this.retryMs);
      this.retryMs = Math.min(this.retryMs * 2, 30000);
    }
  }

  private async read(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let split: number;
      while ((split = buffer.indexOf('\n\n')) >= 0) {
        this.handleFrame(buffer.slice(0, split));
        buffer = buffer.slice(split + 2);
      }
    }
  }

  private handleFrame(frame: string): void {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue; // comment / heartbeat
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    if (event !== 'order-status' || data.length === 0) return;
    try {
      const payload = JSON.parse(data.join('\n')) as { orderId?: string; status?: string };
      if (payload.orderId && payload.status) {
        const orderId = payload.orderId;
        const status = payload.status;
        this.statuses.update(current => ({ ...current, [orderId]: status }));
      }
    } catch {
      /* ignore malformed frame */
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
