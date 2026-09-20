import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { DeliveryApi } from '../../core/delivery-api';
import { NotificationService } from '../../core/notification.service';
import { Delivery, DeliveryStatus } from '../../core/models';

@Component({
  selector: 'app-active-delivery',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <h2>Active Deliveries</h2>

    @if (loading()) {
      <p class="status-text">Loading...</p>
    } @else if (deliveries().length === 0) {
      <div class="empty-state">
        <p>No active deliveries.</p>
        <p class="hint">Accept a delivery from the Available tab to get started.</p>
      </div>
    } @else {
      <div class="list">
        @for (d of deliveries(); track d.id) {
          <div class="delivery-card">
            <div class="card-top">
              <span class="order-id">Order #{{ d.orderId | slice:0:8 }}</span>
              <span class="badge" [attr.data-status]="d.status">{{ d.status }}</span>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">Pickup</span>
                <span>{{ d.pickupAddress }}</span>
              </div>
              @if (d.deliveryAddress) {
                <div class="info-row">
                  <span class="label">Deliver to</span>
                  <span>{{ d.deliveryAddress }}</span>
                </div>
              }
            </div>
            <div class="actions">
              @switch (d.status) {
                @case ('ASSIGNED') {
                  <button class="btn-action" (click)="updateStatus(d, 'PICKED_UP')">📦 Picked Up</button>
                }
                @case ('PICKED_UP') {
                  <button class="btn-action" (click)="updateStatus(d, 'IN_TRANSIT')">🚴 Start Delivery</button>
                }
                @case ('IN_TRANSIT') {
                  <button class="btn-action delivered" (click)="updateStatus(d, 'DELIVERED')">✅ Delivered</button>
                }
              }
              <button type="button" class="btn-location" [class.sharing]="sharingId() === d.id"
                      (click)="toggleLocationSharing(d)">
                {{ sharingId() === d.id ? '📍 Sharing location — stop' : '📍 Share live location' }}
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    h2 { margin: 0 0 20px; color: var(--ink); }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .delivery-card {
      background: var(--surface); border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-id { font-weight: 600; color: var(--ink); }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase; }
    [data-status="ASSIGNED"] { background: var(--info-tint); color: var(--info); }
    [data-status="PICKED_UP"] { background: var(--brand-tint); color: var(--brand-strong); }
    [data-status="IN_TRANSIT"] { background: var(--warning-tint); color: var(--warning); }
    .card-body { margin-bottom: 12px; }
    .info-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 4px; }
    .label { color: var(--ink-faint); min-width: 70px; }
    .actions { display: flex; gap: 8px; }
    .btn-action {
      flex: 1; padding: 10px; background: var(--info); color: var(--surface); border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-action.delivered { background: var(--success); }
    .btn-action:hover { opacity: 0.9; }
    .btn-location {
      flex: 1; padding: 10px; background: var(--surface); color: var(--ink);
      border: 1px solid var(--line); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-location.sharing { background: var(--brand-tint); color: var(--brand-strong); border-color: var(--brand-strong); }
    .btn-location:hover { opacity: 0.9; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--ink-faint); }
    .hint { font-size: 13px; margin-top: 4px; }
    .status-text { color: var(--ink-faint); }
  `]
})
export class ActiveDeliveryComponent implements OnInit, OnDestroy {
  private readonly api = inject(DeliveryApi);
  private readonly notify = inject(NotificationService);

  deliveries = signal<Delivery[]>([]);
  loading = signal(true);

  /** Id of the delivery whose location is currently being shared, or null. */
  sharingId = signal<number | null>(null);
  private watchId: number | null = null;

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.stopSharing(); }

  /**
   * Stream the driver's real GPS position to the delivery service, which caches
   * it (Redis, short TTL) for the customer's live tracking map. Uses the browser
   * Geolocation API's watchPosition so the marker follows the device in real time.
   */
  toggleLocationSharing(delivery: Delivery): void {
    if (this.sharingId() === delivery.id) {
      this.stopSharing();
      this.notify.show('Stopped sharing location');
      return;
    }
    if (!('geolocation' in navigator)) {
      this.notify.show('Geolocation is not available in this browser');
      return;
    }
    this.stopSharing(); // only one active at a time
    this.watchId = navigator.geolocation.watchPosition(
      position => this.api.updateLocation(delivery.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }).subscribe({ error: err => this.notify.show(err.message) }),
      error => { this.notify.show(`Location error: ${error.message}`); this.stopSharing(); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    this.sharingId.set(delivery.id);
    this.notify.show('Sharing live location…');
  }

  private stopSharing(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.sharingId.set(null);
  }

  updateStatus(delivery: Delivery, status: DeliveryStatus): void {
    this.api.updateStatus(delivery.id, { status }).subscribe({
      next: updated => {
        if (status === 'DELIVERED') {
          if (this.sharingId() === updated.id) this.stopSharing();
          this.deliveries.update(list => list.filter(d => d.id !== updated.id));
          this.notify.show('Delivery completed!');
        } else {
          this.deliveries.update(list => list.map(d => d.id === updated.id ? updated : d));
          this.notify.show(`Status → ${status}`);
        }
      },
      error: err => this.notify.show(err.message)
    });
  }

  private load(): void {
    this.api.listMyDeliveries().subscribe({
      next: all => {
        this.deliveries.set(all.filter(d => !['DELIVERED', 'CANCELLED'].includes(d.status)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
