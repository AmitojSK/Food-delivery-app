import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  { path: 'auth', loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'restaurants',
        loadComponent: () => import('./features/consumer/consumer-layout.component').then(m => m.ConsumerLayoutComponent),
        children: [
          { path: '', loadComponent: () => import('./features/consumer/restaurant-list.component').then(m => m.RestaurantListComponent) },
          { path: ':id/menu', loadComponent: () => import('./features/consumer/menu.component').then(m => m.MenuComponent) }
        ]
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
        children: [
          { path: '', redirectTo: 'users', pathMatch: 'full' },
          { path: 'users', loadComponent: () => import('./features/admin/admin-users.component').then(m => m.AdminUsersComponent) },
          { path: 'restaurants', loadComponent: () => import('./features/admin/admin-restaurants.component').then(m => m.AdminRestaurantsComponent) },
          { path: 'catalogue', loadComponent: () => import('./features/admin/admin-catalogue.component').then(m => m.AdminCatalogueComponent) },
          { path: 'orders', loadComponent: () => import('./features/admin/admin-orders.component').then(m => m.AdminOrdersComponent) }
        ]
      },
      { path: '', redirectTo: 'restaurants', pathMatch: 'full' }
    ]
  }
];
