import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStore } from '../../core/data-store.service';
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

      @switch (store.browseState()) {
        @case ('loading') {
          <div class="loading-inline"><span class="spinner"></span> Loading restaurants…</div>
        }
        @case ('error') {
          <div class="empty cold-start">
            @if (store.browseBusy()) {
              <h3>We're a bit busy right now</h3>
              <p>Too many requests in a short time — wait a few seconds, then try again.</p>
            } @else {
              <h3>Couldn't reach our kitchen</h3>
              <p>The demo services may be asleep. Tap Try again — it can take a few tries over ~a minute while they wake.</p>
            }
            <div class="cold-actions">
              <button type="button" (click)="reload()">Try again</button>
            </div>
          </div>
        }
        @default {
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
      }
    </section>
  `
})
export class RestaurantListComponent {
  protected readonly store = inject(DataStore);

  protected imageFor(restaurant: Restaurant): string {
    return restaurantImageUrl(restaurant, this.store.foodItems());
  }

  protected onImgError(event: Event, label: string): void {
    swapToFallback(event, label);
  }

  // Re-run the catalogue load; it retries while the backend wakes, so this doubles as "wake + load".
  protected reload(): void {
    this.store.loadBrowse();
  }
}
