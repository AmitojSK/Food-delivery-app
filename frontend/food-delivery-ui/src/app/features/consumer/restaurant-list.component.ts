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
          <div class="loading-inline">
            <span class="spinner"></span>
            @if (store.warm.status() === 'warming') {
              Waking the kitchen… ({{ store.warm.ready() }}/{{ store.warm.total() }})
            } @else {
              Loading restaurants…
            }
          </div>
        }
        @case ('error') {
          <div class="empty cold-start">
            @if (store.browseBusy()) {
              <h3>We're a bit busy right now</h3>
              <p>Too many requests in a short time — wait a few seconds, then try again.</p>
            } @else {
              <h3>Couldn't reach our kitchen</h3>
              <p>The demo services may be asleep. Tap Try again — waking them can take a couple of minutes.</p>
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

  // "Try again" after a failure: wake the whole stack via its health endpoints (which also wakes a
  // cold gateway — the case a plain re-fetch can't recover, since those requests are 429'd at the
  // edge before reaching an origin), then reload the catalogue.
  protected reload(): void {
    this.store.warmAndReloadBrowse();
  }
}
