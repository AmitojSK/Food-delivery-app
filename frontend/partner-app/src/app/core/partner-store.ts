import { Injectable, signal, computed } from '@angular/core';
import { Restaurant } from './models';

@Injectable({ providedIn: 'root' })
export class PartnerStore {
  readonly restaurants = signal<Restaurant[]>([]);
  readonly selectedRestaurantId = signal<number | null>(null);

  readonly selectedRestaurant = computed(() => {
    const id = this.selectedRestaurantId();
    return this.restaurants().find(r => r.id === id) ?? null;
  });

  selectRestaurant(id: number): void {
    this.selectedRestaurantId.set(id);
  }
}
