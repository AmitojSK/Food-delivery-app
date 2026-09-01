import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DeliveryApi } from '../../core/delivery-api';
import { NotificationService } from '../../core/notification.service';
import { Delivery } from '../../core/models';

@Component({
  selector: 'app-available-deliveries',
  standalone: true,
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
    h2 { margin: 0; color: #1a1a2e; }
    .btn-refresh { padding: 8px 14px; background: #fff; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .delivery-card {
      background: #fff; border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-id { font-weight: 600; color: #1a1a2e; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .badge.pending { background: #fff3cd; color: #856404; }
    .card-body { margin-bottom: 12px; }
    .info-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 4px; }
    .label { color: #888; min-width: 70px; }
    .btn-accept {
      width: 100%; padding: 10px; background: #2ecc71; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-accept:hover { background: #27ae60; }
    .empty-state { text-align: center; padding: 60px 20px; color: #888; }
    .hint { font-size: 13px; margin-top: 4px; }
    .status-text { color: #888; }
  `]
})
export class AvailableDeliveriesComponent implements OnInit {
  private readonly api = inject(DeliveryApi);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  deliveries = signal<Delivery[]>([]);
  loading = signal(true);

  ngOnInit(): void { this.load(); }

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
