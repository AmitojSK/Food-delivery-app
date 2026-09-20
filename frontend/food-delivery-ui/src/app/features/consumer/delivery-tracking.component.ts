import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { DriverLocation } from '../../core/models';

/**
 * Live driver-location map for a customer's in-flight order.
 *
 * Driven by the order's live status (from the SSE stream). While the order is
 * OUT_FOR_DELIVERY it resolves the delivery id once, then polls the delivery
 * service's `driver-location` endpoint (Redis-backed, short TTL) and moves the
 * marker. The endpoint 404s until a driver is assigned and reports a fix, which
 * is the expected "waiting" state, so we poll quietly and show a placeholder.
 *
 * Uses Leaflet with free OpenStreetMap tiles — no API key, nothing server-side.
 */
@Component({
  selector: 'app-delivery-tracking',
  imports: [CommonModule],
  template: `
    <div class="tracking">
      <div class="tracking-head">
        <span class="live-dot" aria-hidden="true"></span>
        <span>{{ location() ? 'Driver en route — live location' : 'Waiting for the driver\\'s location…' }}</span>
      </div>
      <div #mapEl class="tracking-map" [class.is-idle]="!location()"></div>
      @if (location(); as loc) {
        <p class="tracking-meta muted">Updated {{ loc.updatedAt | date: 'shortTime' }}</p>
      }
    </div>
  `,
  styles: [`
    .tracking { margin-top: 0.75rem; }
    .tracking-head { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .tracking-map {
      height: 220px; width: 100%; border-radius: var(--radius-md, 12px);
      overflow: hidden; border: 1px solid var(--line, #e5e2dd); background: var(--surface-2, #f3f1ee);
    }
    .tracking-map.is-idle { display: flex; align-items: center; justify-content: center; }
    .tracking-meta { margin: 0.4rem 0 0; font-size: 0.75rem; }
  `]
})
export class DeliveryTrackingComponent implements AfterViewInit, OnDestroy {
  readonly orderId = input.required<string>();
  /** Live order status; polling runs only while OUT_FOR_DELIVERY. */
  readonly status = input.required<string>();

  private readonly api = inject(FoodDeliveryApi);
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('mapEl');

  protected readonly location = signal<DriverLocation | null>(null);

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private deliveryId: number | null = null;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private viewReady = false;

  constructor() {
    // React to the live status: start polling when out for delivery, stop when it ends.
    effect(() => {
      const status = this.status();
      if (status === 'OUT_FOR_DELIVERY') {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    // If a location already arrived before the view initialised, render it now.
    const loc = this.location();
    if (loc) this.renderLocation(loc);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.map?.remove();
    this.map = null;
  }

  private startPolling(): void {
    if (this.pollHandle) return;
    void this.tick();
    this.pollHandle = setInterval(() => void this.tick(), 5000);
  }

  private stopPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.deliveryId === null) {
      const delivery = await firstOrNull(this.api.getDeliveryByOrder(this.orderId()));
      if (!delivery) return; // not created yet — try again next tick
      this.deliveryId = delivery.id;
    }
    const loc = await firstOrNull(this.api.getDriverLocation(this.deliveryId));
    if (!loc) return; // no fix yet — keep the placeholder and retry
    this.location.set(loc);
    if (this.viewReady) this.renderLocation(loc);
  }

  private renderLocation(loc: DriverLocation): void {
    const latLng: L.LatLngExpression = [loc.latitude, loc.longitude];
    if (!this.map) {
      this.map = L.map(this.mapEl().nativeElement, {
        center: latLng,
        zoom: 15,
        attributionControl: true,
        zoomControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      const icon = L.divIcon({
        className: 'driver-pin',
        html: '<span style="font-size:26px;line-height:26px">🛵</span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      this.marker = L.marker(latLng, { icon }).addTo(this.map);
      // The container may have been sized after creation; make sure tiles fill it.
      setTimeout(() => this.map?.invalidateSize(), 0);
    } else {
      this.marker?.setLatLng(latLng);
      this.map.panTo(latLng);
    }
  }
}

/** Resolve an Observable's first emission to a promise, treating errors as null. */
function firstOrNull<T>(obs: import('rxjs').Observable<T>): Promise<T | null> {
  return new Promise(resolve => {
    const sub = obs.subscribe({
      next: value => { resolve(value); sub.unsubscribe(); },
      error: () => resolve(null),
      complete: () => resolve(null)
    });
  });
}
