import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-restaurant-list',
  imports: [RouterLink],
  template: `
    <section class="browse">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Restaurants</p>
          <h2>Choose where to order from</h2>
        </div>
      </div>

      <div class="restaurant-grid">
        @for (restaurant of store.restaurants(); track restaurant.id) {
          <article class="restaurant-card">
            <div class="restaurant-art">
              <span>{{ restaurant.name.charAt(0) }}</span>
            </div>
            <div>
              <h3>{{ restaurant.name }}</h3>
              <p>{{ restaurant.cuisineType }}</p>
              <p class="muted">{{ restaurant.city }}, {{ restaurant.state }}</p>
            </div>
            <a [routerLink]="['/restaurants', restaurant.id, 'menu']">
              <button type="button">View Menu</button>
            </a>
          </article>
        } @empty {
          <div class="empty">
            <h3>No restaurants yet</h3>
            <p>Add restaurants from the Admin workflow to start ordering.</p>
          </div>
        }
      </div>
    </section>
  `
})
export class RestaurantListComponent {
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);
}
