import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { FoodDeliveryApi } from './food-delivery-api';
import { WarmUpService } from './warm-up.service';
import { FoodItem, Order, Restaurant, User } from './models';

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly api = inject(FoodDeliveryApi);
  // Exposed so the browse view can show "Waking the kitchen… (n/6)" progress during a cold start.
  readonly warm = inject(WarmUpService);
  // Auto-warm the backends at most once per cold-browse session; after that the user drives retries.
  private hasAutoWarmed = false;

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
   * Loads the public catalogue (restaurants + menu items). Both calls self-heal through a free-tier
   * cold start with spaced, bounded retries (see `coldStartRetry`), so the list stays on the loading
   * spinner while a sleeping backend wakes instead of flashing a "busy" error — without becoming the
   * request burst that previously tripped the edge's rate limiting. Restaurants is the critical call
   * and drives the state; menu-item imagery loads independently so a cold catalogue service (which
   * wakes separately) can never block or error the restaurant list. Only after the retries are
   * exhausted does the "try again" panel appear.
   */
  loadBrowse(): void {
    // Reuse a recent fetch — the catalogue is near-static, so reloads within the TTL serve from
    // cache with no network call (so repeated page loads don't pile up requests on the edge).
    const cached = readBrowseCache();
    if (cached) {
      this.restaurants.set(cached.restaurants);
      this.foodItems.set(cached.foodItems);
      this.browseState.set('ready');
      return;
    }
    this.browseState.set('loading');
    this.browseBusy.set(false);

    // Imagery — off the critical path: a cold catalogue must never hold up or fail the list, so
    // tolerate its failure (blank-photo fallback) and refresh the cache once it arrives.
    this.api.browseFoodItems().pipe(catchError(() => of([] as FoodItem[]))).subscribe(foodItems => {
      this.foodItems.set(foodItems);
      this.cacheBrowse();
    });

    // Restaurants — the critical call; drives the browse state.
    this.api.browseRestaurants().subscribe({
      next: restaurants => {
        this.restaurants.set(restaurants);
        this.browseState.set('ready');
        this.cacheBrowse();
      },
      error: (error: unknown) => {
        // A fully-cold stack is 429'd/5xx'd at the edge before a request can reach an origin, and the
        // bounded fetch retry can't outlast the gateway's own ~90s cold start. So on the first failure,
        // wake the backends via their health endpoints (which also wakes the gateway) and re-fetch —
        // the reliable path when nothing is awake yet. Only after that fails do we show the panel.
        if (!this.hasAutoWarmed) {
          this.hasAutoWarmed = true;
          this.warmAndReloadBrowse();
          return;
        }
        this.browseBusy.set(isRateLimited(error));
        this.browseState.set('error');
      }
    });
  }

  /**
   * Recover a cold-start failure: ping every backend's health endpoint (through the gateway's public
   * health routes, which wakes the gateway itself too) until they answer, then reload the catalogue.
   * This is the reliable path when the whole stack is asleep, since Render's edge rate-limits requests
   * to a hibernating service and a normal fetch can't outlast its cold start. Also the "Try again"
   * action. The browse view shows live "Waking the kitchen… (n/6)" progress via `warm` while it runs.
   */
  warmAndReloadBrowse(): void {
    if (this.warm.status() === 'warming') return; // a warm is already in flight; it will reload on completion
    this.browseState.set('loading');
    this.browseBusy.set(false);
    this.warm.warmUp().subscribe({
      next: () => this.loadBrowse(),
      error: () => this.browseState.set('error')
    });
  }

  // Persist the browse cache once the restaurant list is ready, using whatever imagery has loaded so
  // far. Called from both loads, so whichever finishes last writes the complete snapshot; a reload in
  // the brief gap before imagery arrives just re-fetches it.
  private cacheBrowse(): void {
    if (this.browseState() === 'ready') {
      writeBrowseCache(this.restaurants(), this.foodItems());
    }
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

// Per-session cache of the (near-static) public catalogue, so reloads don't re-fetch it.
const BROWSE_CACHE_KEY = 'food-delivery-browse';
const BROWSE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function readBrowseCache(): { restaurants: Restaurant[]; foodItems: FoodItem[] } | null {
  try {
    const raw = sessionStorage.getItem(BROWSE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; restaurants?: Restaurant[]; foodItems?: FoodItem[] };
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > BROWSE_CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.restaurants) || !Array.isArray(parsed.foodItems)) return null;
    return { restaurants: parsed.restaurants, foodItems: parsed.foodItems };
  } catch {
    return null; // private mode / blocked storage — just skip the cache
  }
}

function writeBrowseCache(restaurants: Restaurant[], foodItems: FoodItem[]): void {
  try {
    sessionStorage.setItem(BROWSE_CACHE_KEY, JSON.stringify({ ts: Date.now(), restaurants, foodItems }));
  } catch {
    // storage unavailable/full — caching is best-effort, ignore
  }
}
