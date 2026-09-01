import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerApi } from '../../core/partner-api';
import { NotificationService } from '../../core/notification.service';
import { FoodItem } from '../../core/models';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <a routerLink="/restaurants" class="back-link">← Back to Restaurants</a>
        <h2>Menu Management</h2>
      </div>
    </div>

    <div class="add-section">
      <h3>Add Menu Item</h3>
      <form (ngSubmit)="addItem()" class="form-row">
        <input [(ngModel)]="newItem.name" name="name" placeholder="Item name" required />
        <input [(ngModel)]="newItem.description" name="description" placeholder="Description" />
        <input [(ngModel)]="newItem.category" name="category" placeholder="Category" required />
        <input [(ngModel)]="newItem.price" name="price" type="number" step="0.01" placeholder="Price" required />
        <button type="submit" class="btn-primary" [disabled]="addLoading()">Add</button>
      </form>
      @if (addError(); as err) {
        <p class="error">{{ err }}</p>
      }
    </div>

    @if (loading()) {
      <p class="status-text">Loading menu...</p>
    } @else if (items().length === 0) {
      <p class="status-text">No menu items yet. Add your first item above.</p>
    } @else {
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id) {
            <tr>
              <td>
                <strong>{{ item.name }}</strong>
                <span class="desc">{{ item.description }}</span>
              </td>
              <td>{{ item.category }}</td>
              <td>₹{{ item.price }}</td>
              <td>
                <span class="badge" [class.active]="item.available" [class.inactive]="!item.available">
                  {{ item.available ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <button class="btn-sm" (click)="toggleAvailability(item)">
                  {{ item.available ? 'Mark Unavailable' : 'Mark Available' }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .back-link { color: #888; text-decoration: none; font-size: 13px; }
    .back-link:hover { color: #333; }
    h2 { margin: 8px 0 0; color: #1a1a2e; }
    h3 { margin: 0 0 12px; color: #1a1a2e; font-size: 16px; }
    .add-section {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .form-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .form-row input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      flex: 1;
      min-width: 120px;
    }
    .form-row input:focus { border-color: #e67e22; }
    .data-table {
      width: 100%;
      background: #fff;
      border-radius: 12px;
      border-collapse: collapse;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .data-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      color: #888;
      border-bottom: 1px solid #eee;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid #f5f5f5;
    }
    .desc { display: block; font-size: 12px; color: #888; }
    .badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .badge.active { background: #d4edda; color: #155724; }
    .badge.inactive { background: #f8d7da; color: #721c24; }
    .btn-primary {
      padding: 8px 16px;
      background: #e67e22;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-primary:disabled { opacity: 0.6; }
    .btn-sm {
      padding: 5px 10px;
      background: #f0f0f0;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-sm:hover { background: #e0e0e0; }
    .error { color: #e74c3c; font-size: 13px; margin: 8px 0 0; }
    .status-text { color: #888; }
  `]
})
export class MenuManagementComponent implements OnInit {
  private readonly api = inject(PartnerApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  private restaurantId = 0;

  items = signal<FoodItem[]>([]);
  loading = signal(true);
  addLoading = signal(false);
  addError = signal<string | null>(null);

  newItem = { name: '', description: '', category: '', price: 0 };

  ngOnInit(): void {
    this.restaurantId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadItems();
  }

  addItem(): void {
    this.addError.set(null);
    this.addLoading.set(true);
    this.api.createFoodItem({
      restaurantId: this.restaurantId,
      name: this.newItem.name,
      description: this.newItem.description,
      category: this.newItem.category,
      price: this.newItem.price
    }).subscribe({
      next: item => {
        this.items.update(list => [...list, item]);
        this.newItem = { name: '', description: '', category: '', price: 0 };
        this.addLoading.set(false);
        this.notify.show('Item added');
      },
      error: err => {
        this.addError.set(err.message);
        this.addLoading.set(false);
      }
    });
  }

  toggleAvailability(item: FoodItem): void {
    this.api.updateFoodItem(item.id, { available: !item.available }).subscribe({
      next: updated => {
        this.items.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.notify.show(`${updated.name} is now ${updated.available ? 'available' : 'unavailable'}`);
      }
    });
  }

  private loadItems(): void {
    this.api.listFoodItems(this.restaurantId).subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
