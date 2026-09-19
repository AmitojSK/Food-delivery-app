import { Component, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { PartnerApi } from '../../core/partner-api';
import { NotificationService } from '../../core/notification.service';
import { RealtimeStream, OrderStatusEvent } from '../../core/realtime-stream.service';
import { Order, OrderStatus } from '../../core/models';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  template: `
    <div class="page-header">
      <div>
        <a routerLink="/restaurants" class="back-link">← Back to Restaurants</a>
        <h2>Order Management</h2>
      </div>
      <div class="filters">
        @for (f of statusFilters; track f.value) {
          <button
            class="filter-btn"
            [class.active]="activeFilter() === f.value"
            (click)="filterByStatus(f.value)"
          >{{ f.label }}</button>
        }
      </div>
    </div>

    @if (loading()) {
      <p class="status-text">Loading orders...</p>
    } @else if (orders().length === 0) {
      <p class="status-text">No orders found.</p>
    } @else {
      <div class="order-list">
        @for (order of orders(); track order.id) {
          <div class="order-card">
            <div class="order-header">
              <span class="order-id">#{{ order.id | slice:0:8 }}</span>
              <span class="order-status" [attr.data-status]="order.status">{{ order.status }}</span>
            </div>
            <div class="order-items">
              @for (item of order.items; track item.foodItemId) {
                <span>{{ item.quantity }}× {{ item.foodItemName }}</span>
              }
            </div>
            <div class="order-footer">
              <span class="order-total">₹{{ order.totalAmount }}</span>
              <span class="order-time">{{ order.createdAt | slice:0:16 }}</span>
              <div class="order-actions">
                @switch (order.status) {
                  @case ('CREATED') {
                    <button class="btn-action confirm" (click)="updateStatus(order, 'CONFIRMED')">Accept</button>
                    <button class="btn-action cancel" (click)="updateStatus(order, 'CANCELLED')">Reject</button>
                  }
                  @case ('CONFIRMED') {
                    <button class="btn-action" (click)="updateStatus(order, 'PREPARING')">Start Preparing</button>
                  }
                  @case ('PREPARING') {
                    <button class="btn-action" (click)="updateStatus(order, 'READY_FOR_PICKUP')">Ready for Pickup</button>
                  }
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .back-link { color: var(--ink-faint); text-decoration: none; font-size: 13px; }
    .back-link:hover { color: var(--ink); }
    h2 { margin: 8px 0 0; color: var(--ink); }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .filter-btn {
      padding: 6px 12px;
      background: var(--surface);
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .filter-btn.active { background: var(--brand); color: var(--surface); border-color: var(--brand); }
    .order-list { display: flex; flex-direction: column; gap: 12px; }
    .order-card {
      background: var(--surface);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .order-id { font-weight: 600; color: var(--ink); }
    .order-status {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
    [data-status="CREATED"] { background: var(--warning-tint); color: var(--warning); }
    [data-status="CONFIRMED"] { background: var(--info-tint); color: var(--info); }
    [data-status="PREPARING"] { background: var(--brand-tint); color: var(--brand-strong); }
    [data-status="READY_FOR_PICKUP"] { background: var(--success-tint); color: var(--success); }
    [data-status="OUT_FOR_DELIVERY"] { background: var(--success-tint); color: var(--success); }
    [data-status="DELIVERED"] { background: var(--info-tint); color: var(--info); }
    [data-status="CANCELLED"] { background: var(--danger-tint); color: var(--danger); }
    .order-items { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: var(--ink-soft); margin-bottom: 12px; }
    .order-footer { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .order-total { font-weight: 600; color: var(--ink); }
    .order-time { font-size: 12px; color: var(--ink-faint); }
    .order-actions { margin-left: auto; display: flex; gap: 6px; }
    .btn-action {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: var(--brand);
      color: var(--surface);
    }
    .btn-action.confirm { background: var(--success); }
    .btn-action.cancel { background: var(--danger); }
    .btn-action:hover { opacity: 0.9; }
    .status-text { color: var(--ink-faint); }
  `]
})
export class OrderManagementComponent implements OnInit, OnDestroy {
  private readonly api = inject(PartnerApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly stream = inject(RealtimeStream);

  private restaurantId = 0;

  constructor() {
    // React to live order events for this restaurant: update a known order's status
    // in place, or reload when a new order arrives (or a filter is active).
    effect(() => {
      const event = this.stream.lastEvent();
      // untracked: react only to new events, not to the orders/filter signals the
      // handler itself reads and writes (which would otherwise re-trigger this effect).
      if (event) untracked(() => this.applyEvent(event));
    });
  }

  orders = signal<Order[]>([]);
  loading = signal(true);
  activeFilter = signal<OrderStatus | null>(null);

  statusFilters: { label: string; value: OrderStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'New', value: 'CREATED' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Preparing', value: 'PREPARING' },
    { label: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
    { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  ngOnInit(): void {
    this.restaurantId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadOrders();
    this.stream.connect();
  }

  ngOnDestroy(): void {
    this.stream.disconnect();
  }

  private applyEvent(event: OrderStatusEvent): void {
    if (!this.restaurantId || Number(event.restaurantId) !== this.restaurantId) return;
    const known = this.orders().some(o => o.id === event.orderId);
    if (event.status === 'CREATED' && !known) {
      this.notify.show('🔔 New order received');
    }
    // With a status filter active, reload so the list keeps matching the filter.
    if (this.activeFilter()) { this.loadOrders(); return; }
    if (known) {
      this.orders.update(list =>
        list.map(o => o.id === event.orderId ? { ...o, status: event.status as OrderStatus } : o));
    } else {
      this.loadOrders();
    }
  }

  filterByStatus(status: OrderStatus | null): void {
    this.activeFilter.set(status);
    this.loadOrders();
  }

  updateStatus(order: Order, status: OrderStatus): void {
    this.api.updateOrderStatus(order.id, this.restaurantId, { status }).subscribe({
      next: updated => {
        this.orders.update(list => list.map(o => o.id === updated.id ? updated : o));
        this.notify.show(`Order #${updated.id.slice(0, 8)} → ${status}`);
      },
      error: err => this.notify.show(err.message)
    });
  }

  private loadOrders(): void {
    this.loading.set(true);
    this.api.listOrders(this.restaurantId, this.activeFilter() ?? undefined).subscribe({
      next: orders => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
