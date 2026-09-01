import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  ApiErrorResponse,
  AuthenticationResponse,
  CreateUserRequest,
  Delivery,
  DeliveryStatus,
  LoginRequest,
  UpdateDeliveryStatusRequest,
  UpdateLocationRequest
} from './models';

@Injectable({ providedIn: 'root' })
export class DeliveryApi {
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

  listAvailableDeliveries(): Observable<Delivery[]> {
    return this.http
      .get<Delivery[]>('/delivery-api/api/v1/deliveries/available')
      .pipe(catchError(handleApiError));
  }

  listMyDeliveries(status?: DeliveryStatus): Observable<Delivery[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<Delivery[]>('/delivery-api/api/v1/deliveries/driver/my', { params })
      .pipe(catchError(handleApiError));
  }

  acceptDelivery(id: number): Observable<Delivery> {
    return this.http
      .post<Delivery>(`/delivery-api/api/v1/deliveries/${id}/accept`, {})
      .pipe(catchError(handleApiError));
  }

  updateStatus(id: number, request: UpdateDeliveryStatusRequest): Observable<Delivery> {
    return this.http
      .patch<Delivery>(`/delivery-api/api/v1/deliveries/${id}/status`, request)
      .pipe(catchError(handleApiError));
  }

  updateLocation(id: number, request: UpdateLocationRequest): Observable<Delivery> {
    return this.http
      .patch<Delivery>(`/delivery-api/api/v1/deliveries/${id}/location`, request)
      .pipe(catchError(handleApiError));
  }

  getDelivery(id: number): Observable<Delivery> {
    return this.http
      .get<Delivery>(`/delivery-api/api/v1/deliveries/${id}`)
      .pipe(catchError(handleApiError));
  }
}

function handleApiError(error: HttpErrorResponse): Observable<never> {
  const apiError = error.error as Partial<ApiErrorResponse> | undefined;
  const fieldErrors = apiError?.fieldErrors ? Object.values(apiError.fieldErrors).join(' ') : '';
  const message = [apiError?.message, fieldErrors].filter(Boolean).join(' ');
  return throwError(() => new Error(message || `Request failed with status ${error.status}`));
}
