import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  ApiErrorResponse,
  AuthenticationResponse,
  CreateFoodItemRequest,
  CreateRestaurantRequest,
  CreateUserRequest,
  FoodItem,
  LoginRequest,
  Order,
  OrderStatus,
  Restaurant,
  UpdateFoodItemRequest,
  UpdateOrderStatusRequest,
  UpdateRestaurantRequest
} from './models';

@Injectable({ providedIn: 'root' })
export class PartnerApi {
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

  // --- Partner Restaurant APIs ---

  listMyRestaurants(): Observable<Restaurant[]> {
    return this.http
      .get<Restaurant[]>('/restaurant-api/api/v1/partner/restaurants')
      .pipe(catchError(handleApiError));
  }

  createRestaurant(request: CreateRestaurantRequest): Observable<Restaurant> {
    return this.http
      .post<Restaurant>('/restaurant-api/api/v1/partner/restaurants', request)
      .pipe(catchError(handleApiError));
  }

  updateRestaurant(id: number, request: UpdateRestaurantRequest): Observable<Restaurant> {
    return this.http
      .patch<Restaurant>(`/restaurant-api/api/v1/partner/restaurants/${id}`, request)
      .pipe(catchError(handleApiError));
  }

  // --- Partner Food Item APIs ---

  listFoodItems(restaurantId: number): Observable<FoodItem[]> {
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http
      .get<FoodItem[]>('/catalogue-api/api/v1/partner/food-items', { params })
      .pipe(catchError(handleApiError));
  }

  createFoodItem(request: CreateFoodItemRequest): Observable<FoodItem> {
    return this.http
      .post<FoodItem>('/catalogue-api/api/v1/partner/food-items', request)
      .pipe(catchError(handleApiError));
  }

  updateFoodItem(id: number, request: UpdateFoodItemRequest): Observable<FoodItem> {
    return this.http
      .patch<FoodItem>(`/catalogue-api/api/v1/partner/food-items/${id}`, request)
      .pipe(catchError(handleApiError));
  }

  // --- Partner Order APIs ---

  listOrders(restaurantId: number, status?: OrderStatus): Observable<Order[]> {
    let params = new HttpParams().set('restaurantId', restaurantId);
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<Order[]>('/order-api/api/v1/partner/orders', { params })
      .pipe(catchError(handleApiError));
  }

  updateOrderStatus(orderId: string, restaurantId: number, request: UpdateOrderStatusRequest): Observable<Order> {
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http
      .patch<Order>(`/order-api/api/v1/partner/orders/${orderId}/status`, request, { params })
      .pipe(catchError(handleApiError));
  }
}

function handleApiError(error: HttpErrorResponse): Observable<never> {
  const apiError = error.error as Partial<ApiErrorResponse> | undefined;
  const fieldErrors = apiError?.fieldErrors ? Object.values(apiError.fieldErrors).join(' ') : '';
  const message = [apiError?.message, fieldErrors].filter(Boolean).join(' ');

  return throwError(() => new Error(message || `Request failed with status ${error.status}`));
}
