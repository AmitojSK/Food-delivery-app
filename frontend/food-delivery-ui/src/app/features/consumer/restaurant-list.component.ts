import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStore } from '../../core/data-store.service';
import { WarmUpService } from '../../core/warm-up.service';
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
            <h3>Our kitchen is warming up</h3>
            <p>These demo services sleep on the free tier. Wake them, then retry — it can take up to a minute.</p>
            <div class="cold-actions">
              @if (warmUp.status() === 'warming') {
                <button type="button" disabled>Waking services… {{ warmUp.ready() }}/{{ warmUp.total() }}</button>
              } @else {
                <button type="button" (click)="wakeAndReload()">Wake services</button>
              }
              <button class="secondary" type="button" (click)="reload()">Retry</button>
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
  protected readonly warmUp = inject(WarmUpService);

  protected imageFor(restaurant: Restaurant): string {
    return restaurantImageUrl(restaurant, this.store.foodItems());
  }

  protected onImgError(event: Event, label: string): void {
    swapToFallback(event, label);
  }

  protected reload(): void {
    this.store.loadBrowse();
  }

  // Wake the sleeping free-tier backends, then re-load the catalogue once they respond.
  protected wakeAndReload(): void {
    this.warmUp.warmUp().subscribe(() => this.store.loadBrowse());
  }
}
