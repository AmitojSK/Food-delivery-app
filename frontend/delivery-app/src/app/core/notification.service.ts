import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly message = signal<string | null>(null);
  private timeout: ReturnType<typeof setTimeout> | null = null;

  show(message: string, durationMs = 4000): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.message.set(message);
    this.timeout = setTimeout(() => this.message.set(null), durationMs);
  }

  clear(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.message.set(null);
  }
}
