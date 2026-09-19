import { Component, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DeliveryApi } from '../../core/delivery-api';
import { NotificationService } from '../../core/notification.service';
import { RealtimeStream, DeliveryStatusEvent } from '../../core/realtime-stream.service';
import { Delivery } from '../../core/models';

@Component({
  selector: 'app-available-deliveries',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="page-header">
      <h2>Available Deliveries</h2>
      <button class="btn-refresh" (click)="load()">↻ Refresh</button>
    </div>

    @if (loading()) {
      <p class="status-text">Looking for deliveries...</p>
    } @else if (deliveries().length === 0) {
      <div class="empty-state">
        <p>No deliveries available right now.</p>
        <p class="hint">Check back in a moment!</p>
      </div>
    } @else {
      <div class="list">
        @for (d of deliveries(); track d.id) {
          <div class="delivery-card">
            <div class="card-top">
              <span class="order-id">Order #{{ d.orderId | slice:0:8 }}</span>
              <span class="badge pending">PENDING</span>
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
            <button class="btn-accept" (click)="accept(d)">Accept Delivery</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    h2 { margin: 0; color: var(--ink); }
    .btn-refresh { padding: 8px 14px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 6px; cursor: pointer; font-size: 13px; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .delivery-card {
      background: var(--surface); border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-id { font-weight: 600; color: var(--ink); }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .badge.pending { background: var(--warning-tint); color: var(--warning); }
    .card-body { margin-bottom: 12px; }
    .info-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 4px; }
    .label { color: var(--ink-faint); min-width: 70px; }
    .btn-accept {
      width: 100%; padding: 10px; background: var(--success); color: var(--surface); border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-accept:hover { background: var(--success); }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--ink-faint); }
    .hint { font-size: 13px; margin-top: 4px; }
    .status-text { color: var(--ink-faint); }
  `]
})
export class AvailableDeliveriesComponent implements OnInit, OnDestroy {
  private readonly api = inject(DeliveryApi);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly stream = inject(RealtimeStream);

  deliveries = signal<Delivery[]>([]);
  loading = signal(true);

  constructor() {
    // React to live delivery-board events broadcast to all drivers.
    effect(() => {
      const event = this.stream.lastEvent();
      if (event) untracked(() => this.applyEvent(event));
    });
  }

  ngOnInit(): void {
    this.load();
    this.stream.connect();
  }

  ngOnDestroy(): void {
    this.stream.disconnect();
  }

  private applyEvent(event: DeliveryStatusEvent): void {
    const id = Number(event.deliveryId);
    if (event.status === 'PENDING') {
      // A new job appeared. Reload to pull its full details (addresses aren't in the event).
      if (!this.deliveries().some(d => d.id === id)) {
        this.notify.show('🛵 New delivery available');
        this.load();
      }
    } else {
      // Taken or advanced past PENDING — remove it from the available board.
      this.deliveries.update(list => list.filter(d => d.id !== id));
    }
  }

  load(): void {
    this.loading.set(true);
    this.api.listAvailableDeliveries().subscribe({
      next: deliveries => { this.deliveries.set(deliveries); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  accept(delivery: Delivery): void {
    this.api.acceptDelivery(delivery.id).subscribe({
      next: () => {
        this.notify.show('Delivery accepted! Go to Active tab.');
        this.deliveries.update(list => list.filter(d => d.id !== delivery.id));
        this.router.navigate(['/active']);
      },
      error: err => this.notify.show(err.message)
    });
  }
}
