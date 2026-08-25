import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-admin-catalogue',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="panel">
      <form class="form-grid" [formGroup]="form" (ngSubmit)="create()">
        <label>
          Restaurant
          <select formControlName="restaurantId">
            <option [ngValue]="0">Select restaurant</option>
            @for (restaurant of store.restaurants(); track restaurant.id) {
              <option [ngValue]="restaurant.id">{{ restaurant.name }}</option>
            }
          </select>
        </label>
        <label>Item name<input type="text" formControlName="name" /></label>
        <label>Category<input type="text" formControlName="category" /></label>
        <label>Price<input type="number" min="0.01" step="0.01" formControlName="price" /></label>
        <label class="span-2">Description<textarea rows="3" formControlName="description"></textarea></label>
        <button type="submit" [disabled]="notifications.saving()">Create Food Item</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Item</th><th>Restaurant</th><th>Category</th><th>Price</th></tr>
          </thead>
          <tbody>
            @for (item of store.foodItems(); track item.id) {
              <tr>
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ store.restaurantName(item.restaurantId) }}</td>
                <td>{{ item.category }}</td>
                <td>{{ item.price | currency: 'INR' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5">No food items yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class AdminCatalogueComponent {
  private readonly api = inject(FoodDeliveryApi);
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    restaurantId: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(140)]],
    description: ['', [Validators.maxLength(500)]],
    category: ['', [Validators.required, Validators.maxLength(80)]],
    price: [0, [Validators.required, Validators.min(0.01)]]
  });

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.notifications.saving.set(true);
    this.notifications.clearMessages();
    this.api.createFoodItem(this.form.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: item => {
          this.store.foodItems.update(items => [item, ...items]);
          this.form.reset({ restaurantId: 0, name: '', description: '', category: '', price: 0 });
          this.notifications.notice.set('Food item created');
        },
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }
}
