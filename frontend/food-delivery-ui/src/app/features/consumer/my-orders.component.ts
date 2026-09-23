import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { RealtimeStream } from '../../core/realtime-stream.service';
import { Order } from '../../core/models';
import { DeliveryTrackingComponent } from './delivery-tracking.component';

/** The signed-in customer's own order history, newest first, with live status. */
@Component({
  selector: 'app-my-orders',
  imports: [CommonModule, DeliveryTrackingComponent],
  template: `
    <section class="browse">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Your orders</p>
          <h2>Order history</h2>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-inline"><span class="spinner"></span> Loading your orders…</div>
      } @else {
        <div class="orders">
          @for (order of orders(); track order.id) {
            <article class="order-card">
              <div class="order-head">
                <strong>#{{ order.id.slice(0, 8) }}</strong>
                <span class="pill" [attr.data-status]="statusFor(order)">{{ statusLabel(statusFor(order)) }}</span>
              </div>
              <div class="order-items">
                @for (it of order.items; track it.foodItemId) {
                  <span>{{ it.quantity }}× {{ it.foodItemName }}</span>
                }
              </div>
              <div class="order-foot">
                <span class="muted">{{ order.createdAt | date: 'medium' }}</span>
                <strong>{{ order.totalAmount | currency: 'INR' }}</strong>
              </div>
              @if (statusFor(order) === 'OUT_FOR_DELIVERY') {
                <app-delivery-tracking [orderId]="order.id" [status]="statusFor(order)" />
              }
            </article>
          } @empty {
            <div class="empty">
              <h3>No orders yet</h3>
              <p>Place an order and it'll show up here.</p>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .orders { display: flex; flex-direction: column; gap: 12px; }
    .order-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md, 12px); padding: 16px 20px; }
    .order-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .pill { font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; background: var(--surface-2, #f3f1ee); color: var(--ink-soft); }
    [data-status="CREATED"] { background: var(--warning-tint); color: var(--warning); }
    [data-status="CONFIRMED"] { background: var(--info-tint); color: var(--info); }
    [data-status="PREPARING"] { background: var(--brand-tint); color: var(--brand-strong); }
    [data-status="READY_FOR_PICKUP"], [data-status="OUT_FOR_DELIVERY"] { background: var(--success-tint); color: var(--success); }
    [data-status="DELIVERED"] { background: var(--info-tint); color: var(--info); }
    [data-status="CANCELLED"] { background: var(--danger-tint); color: var(--danger); }
    .order-items { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: var(--ink-soft); margin-bottom: 10px; }
    .order-foot { display: flex; justify-content: space-between; align-items: center; }
  `]
})
export class MyOrdersComponent implements OnInit {
  private readonly api = inject(FoodDeliveryApi);
  private readonly stream = inject(RealtimeStream);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);

  private static readonly STATUS_LABELS: Record<string, string> = {
    CREATED: 'Order placed',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Being prepared',
    READY_FOR_PICKUP: 'Ready for pickup',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  };

  ngOnInit(): void {
    this.stream.connect(); // idempotent; keeps statuses live if the user landed here directly
    this.api.listOrders()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: orders => this.orders.set([...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
        error: () => this.orders.set([])
      });
  }

  /** Latest status: prefer the live SSE value, fall back to what was loaded. */
  protected statusFor(order: Order): string {
    return this.stream.statusFor(order.id) ?? order.status;
  }

  protected statusLabel(status: string): string {
    return MyOrdersComponent.STATUS_LABELS[status] ?? status;
  }
}
