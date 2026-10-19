import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, retry, throwError, timer } from 'rxjs';
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
    return this.http
      // Cache-bust (_t) so an empty [] cached during a cold/unconfigured phase can't be replayed
      // and keep the buttons hidden after the backend is up and returning providers.
      .get<OAuth2Provider[]>('/user-api/api/v1/auth/oauth2/providers', { params: { _t: Date.now() } })
      .pipe(retry({
        count: 3,
        delay: (error: unknown, retryCount: number) => {
          const status = error instanceof HttpErrorResponse ? error.status : 0;
          // Cold backend (5xx / no-connection / timeout): quick retry so a waking service self-heals.
          if (status === 0 || status >= 500) {
            return timer(3000);
          }
          // Rate limited: wait out the cooldown and retry ONCE per step, well-spaced — honour the
          // server's Retry-After if present, else exponential backoff (5s, 10s, 20s). This never
          // becomes a tight loop (which is what drains the bucket); after ~3 spaced tries it gives
          // up and the caller shows a Retry button. So a short 429 self-heals without a click.
          if (status === 429) {
            const retryAfterMs = parseRetryAfter(error);
            const backoffMs = Math.min(20_000, 5_000 * 2 ** (retryCount - 1));
            return timer(retryAfterMs ?? backoffMs);
          }
          // Other 4xx: retrying can't help — propagate so the caller shows a message, not a spinner.
          throw error;
        }
      }));
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
