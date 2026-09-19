import { Injectable, inject, signal } from '@angular/core';
import { AuthSession } from './auth-session';

export interface DeliveryStatusEvent {
  deliveryId: string;
  orderId: string;
  status: string;
}

/**
 * Live delivery-board events for drivers, over Server-Sent Events from the
 * realtime-service. Delivery events are broadcast to every connected driver (the
 * job board is open to all of them). Consumed with `fetch` rather than the native
 * EventSource so the JWT can travel in the Authorization header, not the URL.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeStream {
  private readonly auth = inject(AuthSession);
  private controller: AbortController | null = null;
  private running = false;
  private retryMs = 2000;

  /** The most recent delivery-status event seen on the stream. */
  readonly lastEvent = signal<DeliveryStatusEvent | null>(null);

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
        const response = await fetch('/realtime-api/api/v1/stream', {
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
    if (event !== 'delivery-status' || data.length === 0) return;
    try {
      const payload = JSON.parse(data.join('\n')) as Partial<DeliveryStatusEvent>;
      if (payload.deliveryId && payload.status) {
        this.lastEvent.set({
          deliveryId: payload.deliveryId,
          orderId: String(payload.orderId ?? ''),
          status: payload.status
        });
      }
    } catch {
      /* ignore malformed frame */
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
