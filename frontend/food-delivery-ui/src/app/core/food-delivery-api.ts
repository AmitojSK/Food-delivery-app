import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, catchError, of, retry, tap, throwError, timer } from 'rxjs';
import {
  ApiErrorResponse,
  AuthenticationResponse,
  CreateFoodItemRequest,
  CreateOrderRequest,
  CreateRestaurantRequest,
  CreateUserRequest,
  Delivery,
  DriverLocation,
  FoodItem,
  LoginRequest,
  OAuth2Provider,
  Order,
  Restaurant,
  User
} from './models';

@Injectable({ providedIn: 'root' })
export class FoodDeliveryApi {
  private readonly http = inject(HttpClient);

  register(request: CreateUserRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>('/user-api/api/v1/auth/register', request)
      .pipe(catchError(handleApiError));
  }

  login(request: LoginRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>('/user-api/api/v1/auth/login', request)
      .pipe(catchError(handleApiError));
  }

  // The social providers that are actually configured on the backend; the UI shows a button
  // for each. Returns [] on error so the page still works with password sign-in only.
  oauth2Providers(): Observable<OAuth2Provider[]> {
    // The provider list is static config — fetch it at most once per session and reuse it, so
    // repeated page loads don't re-hit the endpoint (which is what runs into the edge's rate
    // limiting). Once a fetch succeeds, reloads serve from the cache with no network call.
    const cached = readCachedProviders();
    if (cached) {
      return of(cached);
    }
    return this.http
      // Cache-bust (_t) belt-and-suspenders against a stale [] (the backend also sends no-store).
      .get<OAuth2Provider[]>('/user-api/api/v1/auth/oauth2/providers', { params: { _t: Date.now() } })
      // Self-heal through a cold backend / brief edge rate-limit with spaced, bounded retries
      // (5s, 10s, 20s) — after ~3 tries it gives up and the caller shows a Retry button.
      .pipe(coldStartRetry({ count: 3, firstBackoffMs: 5_000 }), tap(list => writeCachedProviders(list)));
  }

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>('/user-api/api/v1/users').pipe(catchError(handleApiError));
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>('/user-api/api/v1/users', request).pipe(catchError(handleApiError));
  }

  listRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>('/restaurant-api/api/v1/restaurants').pipe(catchError(handleApiError));
  }

  // Public catalogue, browse page. Unlike listRestaurants (authenticated callers, warm services),
  // this is the FIRST thing an anonymous visitor hits — restaurant-service is usually asleep, so it
  // self-heals through the cold start with spaced, bounded retries (2s, 4s, 8s, 16s, 20s). Keeps the
  // list on the loading spinner while the kitchen wakes instead of flashing a "busy" error.
  browseRestaurants(): Observable<Restaurant[]> {
    return this.http
      .get<Restaurant[]>('/restaurant-api/api/v1/restaurants')
      .pipe(coldStartRetry({ count: 5, firstBackoffMs: 2_000 }), catchError(handleApiError));
  }

  // Owner-scoped: the restaurants belonging to the authenticated RESTAURANT_OWNER.
  listMyRestaurants(): Observable<Restaurant[]> {
    return this.http
      .get<Restaurant[]>('/restaurant-api/api/v1/partner/restaurants')
      .pipe(catchError(handleApiError));
  }

  createRestaurant(request: CreateRestaurantRequest): Observable<Restaurant> {
    return this.http
      .post<Restaurant>('/restaurant-api/api/v1/restaurants', request)
      .pipe(catchError(handleApiError));
  }

  listFoodItems(): Observable<FoodItem[]> {
    return this.http.get<FoodItem[]>('/catalogue-api/api/v1/food-items').pipe(catchError(handleApiError));
  }

  // Menu items for the browse page's imagery — food-catalogue-service cold-starts independently of
  // restaurant-service, so it self-heals on its own (same spaced, bounded retries). The caller loads
  // it off the critical path so a cold catalogue never blocks or errors the restaurant list.
  browseFoodItems(): Observable<FoodItem[]> {
    return this.http
      .get<FoodItem[]>('/catalogue-api/api/v1/food-items')
      .pipe(coldStartRetry({ count: 5, firstBackoffMs: 2_000 }), catchError(handleApiError));
  }

  createFoodItem(request: CreateFoodItemRequest): Observable<FoodItem> {
    return this.http
      .post<FoodItem>('/catalogue-api/api/v1/food-items', request)
      .pipe(catchError(handleApiError));
  }

  listOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/order-api/api/v1/orders').pipe(catchError(handleApiError));
  }

  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>('/order-api/api/v1/orders', request).pipe(catchError(handleApiError));
  }

  // Tracking. Both return null instead of erroring when nothing exists yet: a delivery
  // is created only once the order is ready, and a driver location only after the driver
  // is assigned and reports one, so 404s are the normal "not yet" case while polling.
  getDeliveryByOrder(orderId: string): Observable<Delivery | null> {
    // These are polled live, so bypass the browser HTTP cache — a stale cached
    // response would stall tracking (deliveryId never resolves, location never updates).
    return this.http.get<Delivery>(`/delivery-api/api/v1/deliveries/order/${orderId}`, { params: { _t: Date.now() } })
      .pipe(catchError(() => of(null)));
  }

  getDriverLocation(deliveryId: number): Observable<DriverLocation | null> {
    return this.http.get<DriverLocation>(`/delivery-api/api/v1/deliveries/${deliveryId}/driver-location`, { params: { _t: Date.now() } })
      .pipe(catchError(() => of(null)));
  }
}

// Per-session cache of the (static) social-provider list, so reloads don't re-hit the endpoint.
const PROVIDERS_CACHE_KEY = 'food-delivery-oauth-providers';
const PROVIDERS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

function readCachedProviders(): OAuth2Provider[] | null {
  try {
    const raw = sessionStorage.getItem(PROVIDERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; list?: OAuth2Provider[] };
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > PROVIDERS_CACHE_TTL_MS) return null;
    return Array.isArray(parsed.list) ? parsed.list : null;
  } catch {
    return null; // private mode / blocked storage — just skip the cache
  }
}

function writeCachedProviders(list: OAuth2Provider[]): void {
  try {
    sessionStorage.setItem(PROVIDERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), list }));
  } catch {
    // storage unavailable/full — caching is best-effort, ignore
  }
}

/**
 * Retry an HTTP GET through a free-tier cold start without becoming a request burst.
 *
 * A sleeping Render service answers with an INSTANT 429 (`x-render-routing: hibernate-rate-limited`)
 * while its edge throttles wake traffic; the first request that gets through to the origin then hangs
 * through the ~90s cold start and returns 200. So we retry on 429 / 5xx / no-connection, SPACED
 * (Retry-After if the server sent one, else exponential backoff capped at 20s) and BOUNDED — never a
 * tight loop, which is what drains the edge's bucket. Because a request that reaches the origin hangs
 * rather than failing, retries only accumulate during the brief instant-429 phase (typically 2-4
 * calls, not `count`). Other 4xx propagate — retrying can't help.
 */
function coldStartRetry<T>(opts: { count: number; firstBackoffMs: number }): MonoTypeOperatorFunction<T> {
  return retry({
    count: opts.count,
    delay: (error: unknown, retryCount: number) => {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (status === 429) {
        const retryAfterMs = parseRetryAfter(error);
        const backoffMs = Math.min(20_000, opts.firstBackoffMs * 2 ** (retryCount - 1));
        return timer(retryAfterMs ?? backoffMs);
      }
      // Cold backend (5xx / no-connection / timeout): quick retry so a waking service self-heals.
      if (status === 0 || status >= 500) {
        return timer(3_000);
      }
      throw error; // other 4xx: not retryable
    }
  });
}

// Reads a 429's Retry-After header (seconds or an HTTP-date), in ms, capped at 20s so the UI
// never blocks too long; null when absent/unparseable (caller falls back to exponential backoff).
function parseRetryAfter(error: unknown): number | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const header = error.headers?.get('Retry-After');
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.min(20_000, Math.max(0, seconds) * 1000);
  const dateMs = Date.parse(header);
  return Number.isNaN(dateMs) ? null : Math.min(20_000, Math.max(0, dateMs - Date.now()));
}

function handleApiError(error: HttpErrorResponse): Observable<never> {
  const apiError = error.error as Partial<ApiErrorResponse> | undefined;
  const fieldErrors = apiError?.fieldErrors ? Object.values(apiError.fieldErrors).join(' ') : '';
  const message = [apiError?.message, fieldErrors].filter(Boolean).join(' ');

  return throwError(() => new Error(message || `Request failed with status ${error.status}`));
}
