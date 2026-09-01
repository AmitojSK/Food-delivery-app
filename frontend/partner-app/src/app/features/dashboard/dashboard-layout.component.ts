import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../core/auth-session';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <nav class="sidebar">
        <div class="logo">
          <span class="logo-icon">🍽️</span>
          <span>Partner Portal</span>
        </div>
        <div class="nav-links">
          <a routerLink="/restaurants" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            My Restaurants
          </a>
          <a routerLink="/restaurants/new" routerLinkActive="active">
            Add Restaurant
          </a>
        </div>
        <div class="user-section">
          <span class="user-name">{{ session.user()?.firstName }} {{ session.user()?.lastName }}</span>
          <button class="btn-logout" (click)="logout()">Logout</button>
        </div>
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .sidebar {
      width: 240px;
      background: #1a1a2e;
      color: #fff;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 32px;
    }
    .logo-icon { font-size: 24px; }
    .nav-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-links a {
      padding: 10px 12px;
      border-radius: 8px;
      color: #aaa;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.15s;
    }
    .nav-links a:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
    .nav-links a.active { background: #e67e22; color: #fff; }
    .user-section {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .user-name { font-size: 13px; color: #ccc; }
    .btn-logout {
      padding: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-logout:hover { background: rgba(255, 255, 255, 0.15); }
    .content {
      flex: 1;
      padding: 32px;
      background: #f8f6f3;
      overflow-y: auto;
    }
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
