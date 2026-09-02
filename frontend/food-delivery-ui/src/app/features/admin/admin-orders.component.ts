import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';
import { CreateOrderItemRequest } from '../../core/models';

@Component({
  selector: 'app-admin-orders',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (orderError()) {
      <p class="error">Could not load orders: {{ orderError() }}</p>
    }

    <section class="panel order-layout">
      <form class="form-grid" [formGroup]="form" (ngSubmit)="createOrder()">
        <label>
          User
          <select formControlName="userId">
            <option [ngValue]="0">Select user</option>
            @for (user of store.users(); track user.id) {
              <option [ngValue]="user.id">{{ user.firstName }} {{ user.lastName }}</option>
            }
          </select>
        </label>
        <label>
          Restaurant
          <select formControlName="restaurantId">
            <option [ngValue]="0">Select restaurant</option>
            @for (restaurant of store.restaurants(); track restaurant.id) {
              <option [ngValue]="restaurant.id">{{ restaurant.name }}</option>
            }
          </select>
        </label>
        <label>
          Food item
          <select formControlName="foodItemId">
            <option [ngValue]="0">Select item</option>
            @for (item of store.foodItems(); track item.id) {
              <option [ngValue]="item.id">{{ item.name }} - {{ item.price | currency: 'INR' }}</option>
            }
          </select>
        </label>
        <label>Quantity<input type="number" min="1" formControlName="quantity" /></label>
        <button class="secondary" type="button" (click)="addItem()">Add Item</button>
        <button type="submit" [disabled]="notifications.saving()">Create Order</button>
      </form>

      <aside class="summary">
        <h3>Draft order</h3>
        @for (item of draftItems(); track $index) {
          <div class="line-item">
            <span>{{ item.foodItemName }} x {{ item.quantity }}</span>
            <strong>{{ item.quantity * item.unitPrice | currency: 'INR' }}</strong>
            <button type="button" aria-label="Remove item" (click)="removeItem($index)">x</button>
          </div>
        } @empty {
          <p class="muted">No items added.</p>
        }
        <p class="total">Subtotal <strong>{{ draftTotal() | currency: 'INR' }}</strong></p>
      </aside>
    </section>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Restaurant</th><th>Status</th><th>Total</th></tr>
          </thead>
          <tbody>
            @for (order of store.orders(); track order.id) {
              <tr>
                <td>{{ order.id }}</td>
                <td>{{ store.userName(order.userId) }}</td>
                <td>{{ store.restaurantName(order.restaurantId) }}</td>
                <td><span class="badge">{{ order.status }}</span></td>
                <td>{{ order.totalAmount | currency: 'INR' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5">No orders yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class AdminOrdersComponent implements OnInit {
  private readonly api = inject(FoodDeliveryApi);
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly draftItems = signal<CreateOrderItemRequest[]>([]);
  protected readonly orderError = signal('');

  protected readonly draftTotal = () =>
    this.draftItems().reduce((total, item) => total + item.quantity * item.unitPrice, 0);

  protected readonly form = this.fb.nonNullable.group({
    userId: [0, [Validators.required, Validators.min(1)]],
    restaurantId: [0, [Validators.required, Validators.min(1)]],
    foodItemId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  protected addItem(): void {
    const { foodItemId, quantity } = this.form.getRawValue();
    const foodItem = this.store.foodItems().find(i => i.id === Number(foodItemId));
    if (!foodItem || quantity < 1) {
      this.form.controls.foodItemId.markAsTouched();
      this.form.controls.quantity.markAsTouched();
      return;
    }
    this.draftItems.update(items => [...items, {
      foodItemId: foodItem.id,
      foodItemName: foodItem.name,
      quantity,
      unitPrice: Number(foodItem.price)
    }]);
    this.form.patchValue({ foodItemId: 0, quantity: 1 });
  }

  protected removeItem(index: number): void {
    this.draftItems.update(items => items.filter((_, i) => i !== index));
  }

  protected createOrder(): void {
    const { userId, restaurantId } = this.form.getRawValue();
    if (userId < 1 || restaurantId < 1 || this.draftItems().length === 0) {
      this.form.controls.userId.markAsTouched();
      this.form.controls.restaurantId.markAsTouched();
      this.notifications.error.set('Select a user, restaurant, and at least one order item.');
      return;
    }

    this.notifications.saving.set(true);
    this.notifications.clearMessages();
    this.api.createOrder({
      userId,
      restaurantId,
      deliveryAddress: 'Administrative order - address pending confirmation',
      contactName: 'Administrative order',
      contactPhone: '+0000000000',
      items: this.draftItems()
    })
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: order => {
          this.store.orders.update(orders => [order, ...orders]);
          this.draftItems.set([]);
          this.form.reset({ userId: 0, restaurantId: 0, foodItemId: 0, quantity: 1 });
          this.notifications.notice.set('Order created');
        },
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }

  private loadOrders(): void {
    this.orderError.set('');
    this.api.listOrders().subscribe({
      next: orders => this.store.orders.set(orders),
      error: (e: Error) => {
        this.store.orders.set([]);
        this.orderError.set(e.message);
      }
    });
  }
}
