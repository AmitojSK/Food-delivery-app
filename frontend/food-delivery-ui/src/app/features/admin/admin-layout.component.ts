import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="admin-layout">
      <aside class="admin-sidebar">
        <p class="eyebrow">Admin</p>
        <h2>Service Console</h2>
        <nav class="admin-nav" aria-label="Admin">
          <button type="button" routerLink="users" routerLinkActive="active">Users</button>
          <button type="button" routerLink="restaurants" routerLinkActive="active">Restaurants</button>
          <button type="button" routerLink="catalogue" routerLinkActive="active">Catalogue</button>
          <button type="button" routerLink="orders" routerLinkActive="active">Orders</button>
        </nav>
      </aside>

      <section class="admin-workspace">
        <router-outlet />
      </section>
    </section>
  `
})
export class AdminLayoutComponent implements OnInit {
  private readonly store = inject(DataStore);
  private readonly notifications = inject(NotificationService);

  ngOnInit(): void {
    this.notifications.loading.set(true);
    this.store.loadAdminData()
      .pipe(finalize(() => this.notifications.loading.set(false)))
      .subscribe(({ users, restaurants, foodItems }) => {
        this.store.users.set(users);
        this.store.restaurants.set(restaurants);
        this.store.foodItems.set(foodItems);
      });
  }
}
