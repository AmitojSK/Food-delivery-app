import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';
import { Restaurant } from '../../core/models';
import { restaurantImageUrl, swapToFallback } from '../../core/food-images';
import { RoleNudgeComponent } from './role-nudge.component';

@Component({
  selector: 'app-restaurant-list',
  imports: [RouterLink, RoleNudgeComponent],
  template: `
    <section class="browse">
      <app-role-nudge />
      <div class="section-heading">
        <div>
          <p class="eyebrow">Restaurants</p>
          <h2>Choose where to order from</h2>
        </div>
      </div>

      @if (notifications.loading()) {
        <div class="loading-inline"><span class="spinner"></span> Loading restaurants…</div>
      } @else {
        <div class="restaurant-grid">
          @for (restaurant of store.restaurants(); track restaurant.id) {
            <article class="restaurant-card">
              <img class="card-photo" [src]="imageFor(restaurant)" [alt]="restaurant.name"
                   loading="lazy" (error)="onImgError($event, restaurant.name)" />
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
      }
    </section>
  `
})
export class RestaurantListComponent {
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);

  protected imageFor(restaurant: Restaurant): string {
    return restaurantImageUrl(restaurant, this.store.foodItems());
  }

  protected onImgError(event: Event, label: string): void {
    swapToFallback(event, label);
  }
}
