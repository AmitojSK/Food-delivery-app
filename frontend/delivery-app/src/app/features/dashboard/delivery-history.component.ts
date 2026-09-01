import { Component, inject, OnInit, signal } from '@angular/core';
import { DeliveryApi } from '../../core/delivery-api';
import { Delivery } from '../../core/models';

@Component({
  selector: 'app-delivery-history',
  standalone: true,
  template: `
    <h2>Delivery History</h2>

    @if (loading()) {
      <p class="status-text">Loading...</p>
    } @else if (deliveries().length === 0) {
      <p class="status-text">No completed deliveries yet.</p>
    } @else {
      <div class="list">
        @for (d of deliveries(); track d.id) {
          <div class="history-card">
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
                  <span class="label">Delivered to</span>
                  <span>{{ d.deliveryAddress }}</span>
                </div>
              }
              @if (d.deliveredAt) {
                <div class="info-row">
                  <span class="label">Completed</span>
                  <span>{{ d.deliveredAt | slice:0:16 }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    h2 { margin: 0 0 20px; color: #1a1a2e; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .history-card {
      background: #fff; border-radius: 12px; padding: 14px 18px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .order-id { font-weight: 600; color: #1a1a2e; font-size: 14px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase; }
    [data-status="DELIVERED"] { background: #d4edda; color: #155724; }
    [data-status="CANCELLED"] { background: #f8d7da; color: #721c24; }
    .card-body { font-size: 13px; }
    .info-row { display: flex; gap: 8px; margin-bottom: 3px; }
    .label { color: #888; min-width: 80px; }
    .status-text { color: #888; }
  `]
})
export class DeliveryHistoryComponent implements OnInit {
  private readonly api = inject(DeliveryApi);

  deliveries = signal<Delivery[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.api.listMyDeliveries().subscribe({
      next: all => {
        this.deliveries.set(all.filter(d => ['DELIVERED', 'CANCELLED'].includes(d.status)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
