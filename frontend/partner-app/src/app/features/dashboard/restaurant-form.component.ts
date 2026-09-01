import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartnerApi } from '../../core/partner-api';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-restaurant-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Add New Restaurant</h2>

    <form (ngSubmit)="submit()" class="form">
      <div class="row">
        <label>Restaurant Name
          <input [(ngModel)]="name" name="name" required />
        </label>
        <label>Cuisine Type
          <input [(ngModel)]="cuisineType" name="cuisineType" required />
        </label>
      </div>

      <label>Street Address
        <input [(ngModel)]="streetAddress" name="streetAddress" required />
      </label>

      <div class="row">
        <label>City
          <input [(ngModel)]="city" name="city" required />
        </label>
        <label>State
          <input [(ngModel)]="state" name="state" required />
        </label>
        <label>Postal Code
          <input [(ngModel)]="postalCode" name="postalCode" required />
        </label>
      </div>

      <div class="row">
        <label>Contact Email
          <input type="email" [(ngModel)]="contactEmail" name="contactEmail" required />
        </label>
        <label>Contact Phone
          <input [(ngModel)]="contactPhone" name="contactPhone" required />
        </label>
      </div>

      @if (error(); as err) {
        <p class="error">{{ err }}</p>
      }

      <div class="actions">
        <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="loading()">Create Restaurant</button>
      </div>
    </form>
  `,
  styles: [`
    h2 { margin: 0 0 24px; color: #1a1a2e; }
    .form {
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 640px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .row { display: flex; gap: 12px; }
    .row label { flex: 1; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #555; }
    input {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    input:focus { border-color: #e67e22; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .btn-primary {
      padding: 10px 20px;
      background: #e67e22;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.6; }
    .btn-secondary {
      padding: 10px 20px;
      background: #f0f0f0;
      color: #333;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    .error { color: #e74c3c; font-size: 13px; margin: 0; }
  `]
})
export class RestaurantFormComponent {
  private readonly api = inject(PartnerApi);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  loading = signal(false);
  error = signal<string | null>(null);

  name = '';
  cuisineType = '';
  streetAddress = '';
  city = '';
  state = '';
  postalCode = '';
  contactEmail = '';
  contactPhone = '';

  submit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api.createRestaurant({
      name: this.name,
      cuisineType: this.cuisineType,
      streetAddress: this.streetAddress,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone
    }).subscribe({
      next: () => {
        this.notify.show('Restaurant created successfully');
        this.router.navigate(['/restaurants']);
      },
      error: err => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/restaurants']);
  }
}
