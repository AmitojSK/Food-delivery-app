import { Component, inject, OnInit, signal } from '@angular/core';
import { DeliveryApi } from '../../core/delivery-api';
import { NotificationService } from '../../core/notification.service';
import { Delivery, DeliveryStatus } from '../../core/models';

@Component({
  selector: 'app-active-delivery',
  standalone: true,
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
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    h2 { margin: 0 0 20px; color: #1a1a2e; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .delivery-card {
      background: #fff; border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-id { font-weight: 600; color: #1a1a2e; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase; }
    [data-status="ASSIGNED"] { background: #cce5ff; color: #004085; }
    [data-status="PICKED_UP"] { background: #e2d5f1; color: #5a2d82; }
    [data-status="IN_TRANSIT"] { background: #fff3cd; color: #856404; }
    .card-body { margin-bottom: 12px; }
    .info-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 4px; }
    .label { color: #888; min-width: 70px; }
    .actions { display: flex; gap: 8px; }
    .btn-action {
      flex: 1; padding: 10px; background: #3498db; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-action.delivered { background: #2ecc71; }
    .btn-action:hover { opacity: 0.9; }
    .empty-state { text-align: center; padding: 60px 20px; color: #888; }
    .hint { font-size: 13px; margin-top: 4px; }
    .status-text { color: #888; }
  `]
})
export class ActiveDeliveryComponent implements OnInit {
  private readonly api = inject(DeliveryApi);
  private readonly notify = inject(NotificationService);

  deliveries = signal<Delivery[]>([]);
  loading = signal(true);

  ngOnInit(): void { this.load(); }

  updateStatus(delivery: Delivery, status: DeliveryStatus): void {
    this.api.updateStatus(delivery.id, { status }).subscribe({
      next: updated => {
        if (status === 'DELIVERED') {
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
