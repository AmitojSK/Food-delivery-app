import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FoodDeliveryApi } from '../../core/food-delivery-api';
import { DataStore } from '../../core/data-store.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-admin-restaurants',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="panel">
      <form class="form-grid wide" [formGroup]="form" (ngSubmit)="create()">
        <label>Name<input type="text" formControlName="name" /></label>
        <label>Cuisine<input type="text" formControlName="cuisineType" /></label>
        <label>Street<input type="text" formControlName="streetAddress" /></label>
        <label>City<input type="text" formControlName="city" /></label>
        <label>State<input type="text" formControlName="state" /></label>
        <label>Postal code<input type="text" formControlName="postalCode" /></label>
        <label>Contact email<input type="email" formControlName="contactEmail" /></label>
        <label>Contact phone<input type="tel" formControlName="contactPhone" /></label>
        <button type="submit" [disabled]="notifications.saving()">Create Restaurant</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Cuisine</th><th>Location</th><th>Contact</th></tr>
          </thead>
          <tbody>
            @for (restaurant of store.restaurants(); track restaurant.id) {
              <tr>
                <td>{{ restaurant.id }}</td>
                <td>{{ restaurant.name }}</td>
                <td>{{ restaurant.cuisineType }}</td>
                <td>{{ restaurant.city }}, {{ restaurant.state }}</td>
                <td>{{ restaurant.contactEmail }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5">No restaurants yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class AdminRestaurantsComponent {
  private readonly api = inject(FoodDeliveryApi);
  protected readonly store = inject(DataStore);
  protected readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(140)]],
    cuisineType: ['', [Validators.required, Validators.maxLength(80)]],
    streetAddress: ['', [Validators.required, Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', [Validators.required, Validators.maxLength(20)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    contactPhone: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]]
  });

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.notifications.saving.set(true);
    this.notifications.clearMessages();
    this.api.createRestaurant(this.form.getRawValue())
      .pipe(finalize(() => this.notifications.saving.set(false)))
      .subscribe({
        next: restaurant => {
          this.store.restaurants.update(rs => [restaurant, ...rs]);
          this.form.reset();
          this.notifications.notice.set('Restaurant created');
        },
        error: (e: Error) => this.notifications.error.set(e.message)
      });
  }
}
