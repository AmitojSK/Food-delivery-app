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
      { path: '', redirectTo: 'available', pathMatch: 'full' },
      {
        path: 'available',
        loadComponent: () => import('./features/dashboard/available-deliveries.component').then(m => m.AvailableDeliveriesComponent)
      },
      {
        path: 'active',
        loadComponent: () => import('./features/dashboard/active-delivery.component').then(m => m.ActiveDeliveryComponent)
      },
      {
        path: 'history',
        loadComponent: () => import('./features/dashboard/delivery-history.component').then(m => m.DeliveryHistoryComponent)
      }
    ]
  }
];
