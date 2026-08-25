import { Injectable, computed, inject, signal } from '@angular/core';
import { CreateOrderItemRequest, FoodItem } from './models';

export interface CartItem extends CreateOrderItemRequest {
  restaurantId: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);

  readonly subtotal = computed(() =>
    this.items().reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  );

  addItem(foodItem: FoodItem, restaurantId: number): void {
    this.items.update(items => {
      const existing = items.find(i => i.foodItemId === foodItem.id);
      if (existing) {
        return items.map(i =>
          i.foodItemId === foodItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, {
        restaurantId,
        foodItemId: foodItem.id,
        foodItemName: foodItem.name,
        quantity: 1,
        unitPrice: Number(foodItem.price)
      }];
    });
  }

  updateQuantity(foodItemId: number, change: number): void {
    this.items.update(items =>
      items
        .map(i => i.foodItemId === foodItemId ? { ...i, quantity: i.quantity + change } : i)
        .filter(i => i.quantity > 0)
    );
  }

  clear(): void {
    this.items.set([]);
  }
}
