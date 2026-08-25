import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthSession } from './core/auth-session';
import { NotificationService } from './core/notification.service';
import { CartService } from './core/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthSession);
  protected readonly notifications = inject(NotificationService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.clear();
    this.cart.clear();
    this.notifications.notice.set('You have been signed out.');
    this.router.navigate(['/auth']);
  }
}
