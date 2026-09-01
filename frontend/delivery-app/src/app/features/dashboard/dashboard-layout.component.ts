import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthSession } from '../../core/auth-session';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <header class="topbar">
        <span class="logo">🚴 Delivery Partner</span>
        <nav class="nav-links">
          <a routerLink="/available" routerLinkActive="active">Available</a>
          <a routerLink="/active" routerLinkActive="active">Active</a>
          <a routerLink="/history" routerLinkActive="active">History</a>
        </nav>
        <div class="user-section">
          <span>{{ session.user()?.firstName }}</span>
          <button class="btn-logout" (click)="logout()">Logout</button>
        </div>
      </header>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout { min-height: 100vh; display: flex; flex-direction: column; }
    .topbar {
      background: #1a1a2e; color: #fff; padding: 0 24px; height: 56px;
      display: flex; align-items: center; gap: 24px; flex-shrink: 0;
    }
    .logo { font-weight: 700; font-size: 16px; margin-right: auto; }
    .nav-links { display: flex; gap: 4px; }
    .nav-links a {
      padding: 8px 14px; border-radius: 6px; color: #aaa; text-decoration: none;
      font-size: 14px; transition: background 0.15s;
    }
    .nav-links a:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .nav-links a.active { background: #2ecc71; color: #fff; }
    .user-section { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #ccc; }
    .btn-logout {
      padding: 6px 12px; background: rgba(255,255,255,0.08); border: none;
      border-radius: 6px; color: #fff; cursor: pointer; font-size: 12px;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.15); }
    .content { flex: 1; padding: 24px; background: #f0f2f5; overflow-y: auto; }
  `]
})
export class DashboardLayoutComponent {
  readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  logout(): void {
    this.session.clear();
    this.router.navigate(['/auth']);
  }
}
