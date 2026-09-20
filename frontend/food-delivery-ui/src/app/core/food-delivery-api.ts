import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
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

  googleSignIn(idToken: string): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>('/user-api/api/v1/auth/google', { idToken })
      .pipe(catchError(handleApiError));
  }

  googleConfig(): Observable<{ clientId: string }> {
    return this.http
      .get<{ clientId: string }>('/user-api/api/v1/auth/google/config')
      .pipe(catchError(() => of({ clientId: '' })));
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
    return this.http.get<Delivery>(`/delivery-api/api/v1/deliveries/order/${orderId}`)
      .pipe(catchError(() => of(null)));
  }

  getDriverLocation(deliveryId: number): Observable<DriverLocation | null> {
    return this.http.get<DriverLocation>(`/delivery-api/api/v1/deliveries/${deliveryId}/driver-location`)
      .pipe(catchError(() => of(null)));
  }
}

function handleApiError(error: HttpErrorResponse): Observable<never> {
  const apiError = error.error as Partial<ApiErrorResponse> | undefined;
  const fieldErrors = apiError?.fieldErrors ? Object.values(apiError.fieldErrors).join(' ') : '';
  const message = [apiError?.message, fieldErrors].filter(Boolean).join(' ');

  return throwError(() => new Error(message || `Request failed with status ${error.status}`));
}
