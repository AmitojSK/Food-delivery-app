import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DeliveryApi } from './delivery-api';
import { ApiErrorResponse } from './models';

describe('DeliveryApi', () => {
  let api: DeliveryApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    api = TestBed.inject(DeliveryApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists unassigned deliveries available for pickup', async () => {
    const promise = firstValueFrom(api.listAvailableDeliveries());

    const req = httpMock.expectOne('/delivery-api/api/v1/deliveries/available');
    expect(req.request.method).toBe('GET');
    req.flush([]);

    await expect(promise).resolves.toEqual([]);
  });

  it('filters the driver\'s own deliveries by status when given', async () => {
    const promise = firstValueFrom(api.listMyDeliveries('DELIVERED'));

    const req = httpMock.expectOne(
      (r) => r.url === '/delivery-api/api/v1/deliveries/driver/my' && r.params.get('status') === 'DELIVERED'
    );
    req.flush([]);

    await promise;
  });

  it('omits the status filter when none is given', async () => {
    const promise = firstValueFrom(api.listMyDeliveries());

    const req = httpMock.expectOne('/delivery-api/api/v1/deliveries/driver/my');
    expect(req.request.params.has('status')).toBe(false);
    req.flush([]);

    await promise;
  });

  it('accepts a delivery with an empty POST body', async () => {
    const promise = firstValueFrom(api.acceptDelivery(5));

    const req = httpMock.expectOne('/delivery-api/api/v1/deliveries/5/accept');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});

    await promise;
  });

  it('sends latitude and longitude to the location endpoint', async () => {
    const promise = firstValueFrom(api.updateLocation(5, { latitude: 12.9, longitude: 77.6 }));

    const req = httpMock.expectOne('/delivery-api/api/v1/deliveries/5/location');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ latitude: 12.9, longitude: 77.6 });
    req.flush({});

    await promise;
  });

  it('surfaces a validation error message from a rejected status transition', async () => {
    const promise = firstValueFrom(api.updateStatus(5, { status: 'DELIVERED' }));

    const req = httpMock.expectOne('/delivery-api/api/v1/deliveries/5/status');
    const apiError: ApiErrorResponse = {
      timestamp: '2026-01-01T00:00:00Z', status: 422, error: 'Unprocessable Entity',
      message: 'Cannot transition delivery from ASSIGNED to DELIVERED',
      path: '/delivery-api/api/v1/deliveries/5/status', fieldErrors: {}
    };
    req.flush(apiError, { status: 422, statusText: 'Unprocessable Entity' });

    await expect(promise).rejects.toThrow('Cannot transition delivery from ASSIGNED to DELIVERED');
  });

  it('falls back to a generic message when the error body has no message', async () => {
    const promise = firstValueFrom(api.getDelivery(5));

    const req = httpMock.expectOne('/delivery-api/api/v1/deliveries/5');
    req.flush(null, { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toThrow('Request failed with status 404');
  });
});
