import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  clearMessages(): void {
    this.notice.set('');
    this.error.set('');
  }
}
