import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PartnerApi } from './partner-api';
import { ApiErrorResponse } from './models';

describe('PartnerApi', () => {
  let api: PartnerApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    api = TestBed.inject(PartnerApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists restaurants owned by the authenticated partner', async () => {
    const promise = firstValueFrom(api.listMyRestaurants());

    const req = httpMock.expectOne('/restaurant-api/api/v1/partner/restaurants');
    expect(req.request.method).toBe('GET');
    req.flush([]);

    await expect(promise).resolves.toEqual([]);
  });

  it('scopes order listing to the given restaurant and status', async () => {
    const promise = firstValueFrom(api.listOrders(7, 'READY_FOR_PICKUP'));

    const req = httpMock.expectOne(
      (r) => r.url === '/order-api/api/v1/partner/orders'
        && r.params.get('restaurantId') === '7'
        && r.params.get('status') === 'READY_FOR_PICKUP'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);

    await expect(promise).resolves.toEqual([]);
  });

  it('omits the status filter when none is given', async () => {
    const promise = firstValueFrom(api.listOrders(7));

    const req = httpMock.expectOne(
      (r) => r.url === '/order-api/api/v1/partner/orders' && r.params.get('restaurantId') === '7'
    );
    expect(req.request.params.has('status')).toBe(false);
    req.flush([]);

    await promise;
  });

  it('sends the restaurant id as a query param when updating order status', async () => {
    const promise = firstValueFrom(api.updateOrderStatus('order-1', 7, { status: 'CONFIRMED' }));

    const req = httpMock.expectOne(
      (r) => r.url === '/order-api/api/v1/partner/orders/order-1/status' && r.params.get('restaurantId') === '7'
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'CONFIRMED' });
    req.flush({});

    await promise;
  });

  it('turns a field-validation error response into a readable message', async () => {
    const promise = firstValueFrom(api.createRestaurant({
      name: '', cuisineType: '', streetAddress: '', city: '', state: '', postalCode: '',
      contactEmail: '', contactPhone: ''
    }));

    const req = httpMock.expectOne('/restaurant-api/api/v1/partner/restaurants');
    const apiError: ApiErrorResponse = {
      timestamp: '2026-01-01T00:00:00Z', status: 400, error: 'Bad Request',
      message: 'Request validation failed', path: '/restaurant-api/api/v1/partner/restaurants',
      fieldErrors: { name: 'Name is required' }
    };
    req.flush(apiError, { status: 400, statusText: 'Bad Request' });

    await expect(promise).rejects.toThrow('Request validation failed Name is required');
  });

  it('falls back to a generic message when the error body has no message', async () => {
    const promise = firstValueFrom(api.login({ email: 'a@b.com', password: 'wrong' }));

    const req = httpMock.expectOne('/user-api/api/v1/auth/login');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(promise).rejects.toThrow('Request failed with status 401');
  });
});
