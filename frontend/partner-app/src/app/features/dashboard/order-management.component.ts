import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { PartnerApi } from '../../core/partner-api';
import { NotificationService } from '../../core/notification.service';
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
    .back-link { color: #888; text-decoration: none; font-size: 13px; }
    .back-link:hover { color: #333; }
    h2 { margin: 8px 0 0; color: #1a1a2e; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .filter-btn {
      padding: 6px 12px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .filter-btn.active { background: #e67e22; color: #fff; border-color: #e67e22; }
    .order-list { display: flex; flex-direction: column; gap: 12px; }
    .order-card {
      background: #fff;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .order-id { font-weight: 600; color: #1a1a2e; }
    .order-status {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
    [data-status="CREATED"] { background: #fff3cd; color: #856404; }
    [data-status="CONFIRMED"] { background: #cce5ff; color: #004085; }
    [data-status="PREPARING"] { background: #e2d5f1; color: #5a2d82; }
    [data-status="READY_FOR_PICKUP"] { background: #d4edda; color: #155724; }
    [data-status="OUT_FOR_DELIVERY"] { background: #d4edda; color: #155724; }
    [data-status="DELIVERED"] { background: #d1ecf1; color: #0c5460; }
    [data-status="CANCELLED"] { background: #f8d7da; color: #721c24; }
    .order-items { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: #555; margin-bottom: 12px; }
    .order-footer { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .order-total { font-weight: 600; color: #1a1a2e; }
    .order-time { font-size: 12px; color: #aaa; }
    .order-actions { margin-left: auto; display: flex; gap: 6px; }
    .btn-action {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: #e67e22;
      color: #fff;
    }
    .btn-action.confirm { background: #27ae60; }
    .btn-action.cancel { background: #e74c3c; }
    .btn-action:hover { opacity: 0.9; }
    .status-text { color: #888; }
  `]
})
export class OrderManagementComponent implements OnInit {
  private readonly api = inject(PartnerApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  private restaurantId = 0;

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
