import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, of, timer } from 'rxjs';
import { FoodDeliveryApi } from './food-delivery-api';
import { WarmUpService } from './warm-up.service';
import { FoodItem, Order, Restaurant, User } from './models';

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly api = inject(FoodDeliveryApi);
  // Exposed so the browse view can show "Waking the kitchen… (n/6)" progress during a cold start.
  readonly warm = inject(WarmUpService);
  // True while the warm-and-retry recovery loop is running, so a second trigger doesn't start a
  // parallel loop and the view stays on the loading state until the catalogue actually loads.
  private recovering = false;

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
   * Loads the public catalogue (restaurants + menu items). The fetch self-heals through a brief cold
   * start with a couple of quick retries (see `coldStartRetry`); if that fails — a fully-cold stack,
   * where the edge 429s requests before they reach an origin — it hands off to `warmAndReloadBrowse`,
   * which wakes the backends and loops until the catalogue loads (staying on the "Waking the kitchen…"
   * state, not the error panel). Restaurants is the critical call and drives the state; menu-item
   * imagery loads independently so a cold catalogue service can't block or error the restaurant list.
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
    this.loadBrowseImagery();
    // Restaurants is the critical call; on a cold-stack failure, hand off to the warm-and-retry loop.
    this.loadBrowseRestaurants(() => {}, () => this.warmAndReloadBrowse());
  }

  // Menu-item imagery — off the critical path: a cold catalogue must never hold up or fail the
  // restaurant list, so tolerate its failure (blank-photo fallback) and refresh the cache on arrival.
  private loadBrowseImagery(): void {
    this.api.browseFoodItems().pipe(catchError(() => of([] as FoodItem[]))).subscribe(foodItems => {
      this.foodItems.set(foodItems);
      this.cacheBrowse();
    });
  }

  // Load the (critical) restaurant list; drives the browse state to 'ready' on success.
  private loadBrowseRestaurants(onSuccess: () => void, onError: (error: unknown) => void): void {
    this.api.browseRestaurants().subscribe({
      next: restaurants => {
        this.restaurants.set(restaurants);
        this.browseState.set('ready');
        this.cacheBrowse();
        onSuccess();
      },
      error: onError
    });
  }

  /**
   * Cold-stack recovery, and the "Try again" action: wake the browse-path backends ONCE, then
   * re-fetch the catalogue on a timer until it serves or the attempt budget runs out. It stays on
   * the "Waking the kitchen…" loading state across attempts and NEVER flashes the error panel
   * between them.
   *
   * Two deliberate choices keep the wake-up request volume (and free-tier cost) down — Render
   * health-checks every *woken* service every 5s for ~15 min, so a needless wake is expensive:
   *  - Only the services browse needs are woken ({@link BROWSE_SERVICES}); order/delivery/realtime/
   *    user are left asleep.
   *  - We ping **once** — a single ping reaches Render's edge and triggers the boot, which continues
   *    server-side — then only re-FETCH, instead of re-pinging every cycle (the old loop pinged the
   *    whole stack ~5× per cold start).
   */
  warmAndReloadBrowse(): void {
    if (this.recovering) return; // a recovery loop is already running
    this.recovering = true;
    this.browseBusy.set(false);
    this.browseState.set('loading');
    this.warm.warmUp(BROWSE_SERVICES).subscribe({
      next: () => this.pollBrowseUntilUp(0),
      error: () => { this.recovering = false; this.browseState.set('error'); }
    });
  }

  private pollBrowseUntilUp(attempt: number): void {
    // ~6 fetch attempts ~15s apart (≈90s) outlast the cold boot, without re-pinging the backends.
    const maxAttempts = 6;
    this.browseState.set('loading'); // keep the spinner / warm progress — do not show the panel yet
    this.loadBrowseRestaurants(
      () => { this.recovering = false; this.loadBrowseImagery(); }, // up → load imagery too
      (error: unknown) => {
        if (attempt + 1 < maxAttempts) {
          timer(BROWSE_POLL_INTERVAL_MS).subscribe(() => this.pollBrowseUntilUp(attempt + 1));
        } else {
          this.recovering = false;
          this.browseBusy.set(isRateLimited(error));
          this.browseState.set('error'); // give up only after the budget is exhausted
        }
      }
    );
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

// The public browse flow only needs these services; waking the rest just burns free-tier hours and
// adds Render's every-5s health checks to services the visitor isn't using. Names are Render
// service-name prefixes the warmer Worker matches on.
const BROWSE_SERVICES = ['api-gateway', 'restaurant-service', 'food-catalogue-service'];
// Gap between catalogue re-fetch attempts during a cold-start recovery (no re-pinging in between).
const BROWSE_POLL_INTERVAL_MS = 15_000;

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
