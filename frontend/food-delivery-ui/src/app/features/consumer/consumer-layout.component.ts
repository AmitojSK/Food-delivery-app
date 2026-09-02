import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthSession } from '../../core/auth-session';
import { CartService } from '../../core/cart.service';
import { DataStore } from '../../core/data-store.service';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { NotificationService } from '../../core/notification.service';
import { CreateOrderRequest, Order } from '../../core/models';

@Component({
  selector: 'app-consumer-layout',
  imports: [CommonModule, RouterOutlet],
  template: `
    <section class="consumer-grid">
      <div class="consumer-main">
        <router-outlet />
      </div>

      <aside class="cart-panel">
        <div class="cart-header">
          <h2>🛒 Your cart</h2>
          @if (cart.items().length > 0) {
            <span class="cart-count">{{ cart.items().length }}</span>
          }
        </div>

        @for (item of cart.items(); track item.foodItemId) {
          <div class="cart-line">
            <div>
              <strong>{{ item.foodItemName }}</strong>
              <span>{{ item.unitPrice | currency: 'INR' }}</span>
            </div>
            <div class="quantity">
              <button type="button" (click)="cart.updateQuantity(item.foodItemId, -1)">−</button>
              <span>{{ item.quantity }}</span>
              <button type="button" (click)="cart.updateQuantity(item.foodItemId, 1)">+</button>
            </div>
          </div>
        } @empty {
          <div class="cart-empty">
            <p>Your cart is empty</p>
            <p class="muted">Browse restaurants and add items to get started.</p>
          </div>
        }

        <div class="cart-total">
          <span>Subtotal</span>
          <strong>{{ cart.subtotal() | currency: 'INR' }}</strong>
        </div>

        <form class="checkout" (ngSubmit)="placeOrder()">
          <p class="muted">Ordering as {{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</p>
          <input required placeholder="Delivery address" [value]="deliveryAddress()" (input)="deliveryAddress.set($any($event.target).value)">
          <input required placeholder="Contact name" [value]="contactName()" (input)="contactName.set($any($event.target).value)">
          <input required placeholder="Contact phone" [value]="contactPhone()" (input)="contactPhone.set($any($event.target).value)">
          <button type="submit" [disabled]="notifications.saving() || cart.items().length === 0">Place Order</button>
        </form>

        @if (placedOrder()) {
          <div class="confirmation">
            <p class="eyebrow">Order confirmed</p>
            <strong>#{{ placedOrder()?.id }}</strong>
            <span>{{ placedOrder()?.totalAmount | currency: 'INR' }}</span>
          </div>
        }
      </aside>
    </section>
  `
})
export class ConsumerLayoutComponent implements OnInit {
  protected readonly auth = inject(AuthSession);
  protected readonly cart = inject(CartService);
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);
  private readonly api = inject(FoodDeliveryApi);

  protected readonly placedOrder = signal<Order | null>(null);
  protected readonly deliveryAddress = signal('');
  protected readonly contactName = signal('');
  protected readonly contactPhone = signal('');

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) {
      this.contactName.set(`${user.firstName} ${user.lastName}`);
      this.contactPhone.set(user.phoneNumber);
    }
    this.notifications.loading.set(true);
    this.store.loadPublicData()
      .pipe(finalize(() => this.notifications.loading.set(false)))
      .subscribe(({ restaurants, foodItems }) => {
        this.store.restaurants.set(restaurants);
        this.store.foodItems.set(foodItems);
      });
  }

  protected placeOrder(): void {
    const user = this.auth.user();
    if (!user || this.cart.items().length === 0) return;
    if (!this.deliveryAddress().trim() || !this.contactName().trim() || !this.contactPhone().trim()) {
      this.notifications.error.set('Please provide delivery and contact details.');
      return;
    }

    const firstItem = this.cart.items()[0];
    const request: CreateOrderRequest = {
      userId: user.id,
      restaurantId: firstItem.restaurantId,
      deliveryAddress: this.deliveryAddress().trim(),
      contactName: this.contactName().trim(),
      contactPhone: this.contactPhone().trim(),
      items: this.cart.items().map(({ restaurantId, ...item }) => item)
    };

    this.notifications.saving.set(true);
    this.notifications.error.set('');
    this.api.createOrder(request)
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: order => {
          this.cart.clear();
          this.placedOrder.set(order);
          this.notifications.notice.set('Order placed');
        },
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }
}
