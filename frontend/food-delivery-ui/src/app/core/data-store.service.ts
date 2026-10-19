import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';
import { FoodDeliveryApi } from './food-delivery-api';
import { FoodItem, Order, Restaurant, User } from './models';

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly api = inject(FoodDeliveryApi);

  readonly restaurants = signal<Restaurant[]>([]);
  readonly foodItems = signal<FoodItem[]>([]);
  readonly users = signal<User[]>([]);
  readonly orders = signal<Order[]>([]);

  // Browse (public catalogue) load state, so the restaurant list can tell a genuinely empty
  // catalogue apart from a cold/unreachable backend and show a "services waking up" panel.
  readonly browseState = signal<'loading' | 'ready' | 'error'>('loading');

  /** Loads the public catalogue (restaurants + menu items) and tracks state for the UI. */
  loadBrowse(): void {
    this.browseState.set('loading');
    forkJoin({
      // restaurants is the critical call — if it fails (cold/5xx/429), surface the cold-start state.
      restaurants: this.api.listRestaurants(),
      // menu items are only used for imagery, so a failure there shouldn't block the page.
      foodItems: this.api.listFoodItems().pipe(catchError(() => of([] as FoodItem[])))
    }).subscribe({
      next: ({ restaurants, foodItems }) => {
        this.restaurants.set(restaurants);
        this.foodItems.set(foodItems);
        this.browseState.set('ready');
      },
      error: () => this.browseState.set('error')
    });
  }

  loadAdminData(): Observable<{ users: User[]; restaurants: Restaurant[]; foodItems: FoodItem[] }> {
    return forkJoin({
      users: this.api.listUsers().pipe(catchError(() => of([]))),
      restaurants: this.api.listRestaurants().pipe(catchError(() => of([]))),
      foodItems: this.api.listFoodItems().pipe(catchError(() => of([])))
    });
  }

  restaurantName(restaurantId: number): string {
    return this.restaurants().find(r => r.id === restaurantId)?.name ?? `Restaurant #${restaurantId}`;
  }

  userName(userId: number): string {
    const user = this.users().find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User #${userId}`;
  }
}
