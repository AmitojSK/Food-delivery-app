import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { DataStore } from '../../core/data-store.service';
import { FoodItem } from '../../core/models';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="browse">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ restaurant()?.cuisineType }}</p>
          <h2>{{ restaurant()?.name }}</h2>
          <p class="muted">{{ restaurant()?.streetAddress }}, {{ restaurant()?.city }}</p>
        </div>
        <a routerLink="/restaurants"><button class="secondary" type="button">Change Restaurant</button></a>
      </div>

      <div class="menu-grid">
        @for (item of menuItems(); track item.id) {
          <article class="menu-item">
            <div>
              <p class="category">{{ item.category }}</p>
              <h3>{{ item.name }}</h3>
              <p>{{ item.description || 'Freshly prepared by the restaurant.' }}</p>
            </div>
            <div class="price-row">
              <strong>{{ item.price | currency: 'INR' }}</strong>
              <button type="button" (click)="addToCart(item)">Add</button>
            </div>
          </article>
        } @empty {
          <div class="empty">
            <h3>No menu items yet</h3>
            <p>Add food items for this restaurant from the Admin workflow.</p>
          </div>
        }
      </div>
    </section>
  `
})
export class MenuComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);
  protected readonly store = inject(DataStore);

  private restaurantId = 0;

  protected readonly restaurant = computed(() =>
    this.store.restaurants().find(r => r.id === this.restaurantId) ?? null
  );

  protected readonly menuItems = computed(() =>
    this.store.foodItems().filter(item => item.available && item.restaurantId === this.restaurantId)
  );

  ngOnInit(): void {
    this.restaurantId = Number(this.route.snapshot.paramMap.get('id'));
  }

  protected addToCart(item: FoodItem): void {
    this.cart.addItem(item, this.restaurantId);
  }
}
