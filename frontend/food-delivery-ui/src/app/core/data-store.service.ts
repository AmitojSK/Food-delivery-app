import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';
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
  // catalogue apart from a cold/unreachable backend and show the right panel.
  readonly browseState = signal<'loading' | 'ready' | 'error'>('loading');
  // When the failure is a rate limit (429) rather than a cold backend, show a different message
  // (retrying can't wake it — the caller should wait).
  readonly browseBusy = signal(false);

  /**
   * Loads the public catalogue (restaurants + menu items) in a single attempt — no auto-retry, so
   * a cold load fires just two requests, not a burst (an aggressive retry generated enough volume
   * to trip the platform edge's rate limiting). On failure the UI shows the "try again" panel; the
   * user's manual retry is one request at a time. A rate-limit (429) gets a "busy, wait" message.
   */
  loadBrowse(): void {
    this.browseState.set('loading');
    this.browseBusy.set(false);
    forkJoin({
      // restaurants is the critical call; menu items are only for imagery, so tolerate their failure.
      restaurants: this.api.listRestaurants(),
      foodItems: this.api.listFoodItems().pipe(catchError(() => of([] as FoodItem[])))
    }).subscribe({
      next: ({ restaurants, foodItems }) => {
        this.restaurants.set(restaurants);
        this.foodItems.set(foodItems);
        this.browseState.set('ready');
      },
      error: (error: unknown) => {
        this.browseBusy.set(isRateLimited(error));
        this.browseState.set('error');
      }
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

// The API maps HTTP errors to an Error whose message carries the status (e.g. "...status 429"),
// so a string check is enough to tell a rate limit from a cold-backend failure.
function isRateLimited(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes('429') || message.includes('too many');
}
