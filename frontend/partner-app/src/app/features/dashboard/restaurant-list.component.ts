import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartnerApi } from '../../core/partner-api';
import { Restaurant } from '../../core/models';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <h2>My Restaurants</h2>
      <a routerLink="/restaurants/new" class="btn-primary">+ Add Restaurant</a>
    </div>

    @if (loading()) {
      <p class="status-text">Loading...</p>
    } @else if (restaurants().length === 0) {
      <div class="empty-state">
        <p>You don't have any restaurants yet.</p>
        <a routerLink="/restaurants/new" class="btn-primary">Create your first restaurant</a>
      </div>
    } @else {
      <div class="grid">
        @for (r of restaurants(); track r.id) {
          <div class="card">
            <div class="card-header">
              <h3>{{ r.name }}</h3>
              <span class="badge" [class.active]="r.active" [class.inactive]="!r.active">
                {{ r.active ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <p class="cuisine">{{ r.cuisineType }}</p>
            <p class="address">{{ r.streetAddress }}, {{ r.city }}, {{ r.state }} {{ r.postalCode }}</p>
            <div class="card-actions">
              <a [routerLink]="['/restaurants', r.id, 'menu']" class="btn-secondary">Menu</a>
              <a [routerLink]="['/restaurants', r.id, 'orders']" class="btn-secondary">Orders</a>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h2 { margin: 0; color: #1a1a2e; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .card-header h3 { margin: 0; font-size: 16px; color: #1a1a2e; }
    .badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .badge.active { background: #d4edda; color: #155724; }
    .badge.inactive { background: #f8d7da; color: #721c24; }
    .cuisine { color: #e67e22; font-size: 13px; margin: 0 0 4px; }
    .address { color: #888; font-size: 13px; margin: 0 0 16px; }
    .card-actions { display: flex; gap: 8px; }
    .btn-primary {
      padding: 10px 16px;
      background: #e67e22;
      color: #fff;
      border: none;
      border-radius: 8px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
    }
    .btn-secondary {
      padding: 8px 14px;
      background: #f0f0f0;
      color: #333;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #e0e0e0; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }
    .empty-state .btn-primary { display: inline-block; margin-top: 12px; }
    .status-text { color: #888; }
  `]
})
export class RestaurantListComponent implements OnInit {
  private readonly api = inject(PartnerApi);

  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.api.listMyRestaurants().subscribe({
      next: restaurants => {
        this.restaurants.set(restaurants);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
