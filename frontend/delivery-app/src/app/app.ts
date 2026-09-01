import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './core/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (notification.message(); as msg) {
      <div class="toast">{{ msg }}</div>
    }
    <router-outlet />
  `,
  styles: [`
    .toast {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #1a1a2e;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class App {
  readonly notification = inject(NotificationService);
}
