import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      { path: '', redirectTo: 'restaurants', pathMatch: 'full' },
      {
        path: 'restaurants',
        loadComponent: () => import('./features/dashboard/restaurant-list.component').then(m => m.RestaurantListComponent)
      },
      {
        path: 'restaurants/new',
        loadComponent: () => import('./features/dashboard/restaurant-form.component').then(m => m.RestaurantFormComponent)
      },
      {
        path: 'restaurants/:id/menu',
        loadComponent: () => import('./features/dashboard/menu-management.component').then(m => m.MenuManagementComponent)
      },
      {
        path: 'restaurants/:id/orders',
        loadComponent: () => import('./features/dashboard/order-management.component').then(m => m.OrderManagementComponent)
      }
    ]
  }
];
