import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  ApiErrorResponse,
  AuthenticationResponse,
  CreateFoodItemRequest,
  CreateOrderRequest,
  CreateRestaurantRequest,
  CreateUserRequest,
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

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>('/user-api/api/v1/users').pipe(catchError(handleApiError));
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>('/user-api/api/v1/users', request).pipe(catchError(handleApiError));
  }

  listRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>('/restaurant-api/api/v1/restaurants').pipe(catchError(handleApiError));
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
}

function handleApiError(error: HttpErrorResponse): Observable<never> {
  const apiError = error.error as Partial<ApiErrorResponse> | undefined;
  const fieldErrors = apiError?.fieldErrors ? Object.values(apiError.fieldErrors).join(' ') : '';
  const message = [apiError?.message, fieldErrors].filter(Boolean).join(' ');

  return throwError(() => new Error(message || `Request failed with status ${error.status}`));
}
