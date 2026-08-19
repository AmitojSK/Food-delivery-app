import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';
import { FoodDeliveryApi } from './core/food-delivery-api';
import { AuthSession } from './core/auth-session';
import {
  CreateOrderItemRequest,
  CreateOrderRequest,
  FoodItem,
  Order,
  Restaurant,
  User
} from './core/models';

type AppMode = 'consumer' | 'admin';
type AdminPanel = 'users' | 'restaurants' | 'catalogue' | 'orders';
type AuthScreen = 'login' | 'register';

interface CartItem extends CreateOrderItemRequest {
  restaurantId: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly api = inject(FoodDeliveryApi);
  protected readonly auth = inject(AuthSession);
  private readonly fb = inject(FormBuilder);

  protected readonly mode = signal<AppMode>('consumer');
  protected readonly authScreen = signal<AuthScreen>('login');
  protected readonly activePanel = signal<AdminPanel>('users');
  protected readonly selectedRestaurantId = signal<number | null>(null);
  protected readonly users = signal<User[]>([]);
  protected readonly restaurants = signal<Restaurant[]>([]);
  protected readonly foodItems = signal<FoodItem[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly adminOrderItems = signal<CreateOrderItemRequest[]>([]);
  protected readonly cartItems = signal<CartItem[]>([]);
  protected readonly placedOrder = signal<Order | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly orderError = signal('');

  protected readonly selectedRestaurant = computed(() => {
    const selectedId = this.selectedRestaurantId();
    return this.restaurants().find(restaurant => restaurant.id === selectedId) ?? null;
  });

  protected readonly visibleFoodItems = computed(() => {
    const selectedId = this.selectedRestaurantId();
    return this.foodItems().filter(item => item.available && (!selectedId || item.restaurantId === selectedId));
  });

  protected readonly cartSubtotal = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  );

  protected readonly adminOrderDraftTotal = computed(() =>
    this.adminOrderItems().reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  );

  protected readonly userForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
  });

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected readonly registerForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
  });

  protected readonly restaurantForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(140)]],
    cuisineType: ['', [Validators.required, Validators.maxLength(80)]],
    streetAddress: ['', [Validators.required, Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', [Validators.required, Validators.maxLength(20)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    contactPhone: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]]
  });

  protected readonly foodItemForm = this.fb.nonNullable.group({
    restaurantId: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(140)]],
    description: ['', [Validators.maxLength(500)]],
    category: ['', [Validators.required, Validators.maxLength(80)]],
    price: [0, [Validators.required, Validators.min(0.01)]]
  });

  protected readonly adminOrderForm = this.fb.nonNullable.group({
    userId: [0, [Validators.required, Validators.min(1)]],
    restaurantId: [0, [Validators.required, Validators.min(1)]],
    foodItemId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.loadPublicData();
    if (this.auth.isAdmin()) {
      this.loadAdminData();
    }
  }

  protected setMode(mode: AppMode): void {
    if (mode === 'admin' && !this.auth.isAdmin()) {
      this.error.set('An administrator account is required to open the service console.');
      return;
    }
    this.mode.set(mode);
    this.notice.set('');
    this.error.set('');
    if (mode === 'admin') {
      this.loadAdminData();
    }
  }

  protected setAuthScreen(screen: AuthScreen): void {
    this.authScreen.set(screen);
    this.error.set('');
  }

  protected login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.login(this.loginForm.getRawValue()).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: response => this.completeAuthentication(response),
      error: (error: Error) => this.error.set(error.message)
    });
  }

  protected register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.register(this.registerForm.getRawValue()).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: response => this.completeAuthentication(response),
      error: (error: Error) => this.error.set(error.message)
    });
  }

  protected logout(): void {
    this.auth.clear();
    this.mode.set('consumer');
    this.users.set([]);
    this.orders.set([]);
    this.notice.set('You have been signed out.');
  }

  protected switchPanel(panel: AdminPanel): void {
    this.activePanel.set(panel);

    if (panel === 'orders') {
      this.loadOrders();
    }
  }

  protected selectRestaurant(restaurantId: number): void {
    this.selectedRestaurantId.set(restaurantId);
    this.placedOrder.set(null);
    this.cartItems.set([]);
  }

  protected backToRestaurants(): void {
    this.selectedRestaurantId.set(null);
    this.placedOrder.set(null);
    this.cartItems.set([]);
  }

  protected loadPublicData(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      restaurants: this.loadResource('restaurants', this.api.listRestaurants()),
      foodItems: this.loadResource('food items', this.api.listFoodItems())
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ restaurants, foodItems }) => {
          this.restaurants.set(restaurants);
          this.foodItems.set(foodItems);
        },
        error: (error: Error) => this.error.set(error.message)
      });
  }

  protected loadAdminData(): void {
    if (!this.auth.isAdmin()) return;
    this.loading.set(true);
    forkJoin({
      users: this.loadResource('users', this.api.listUsers()),
      restaurants: this.loadResource('restaurants', this.api.listRestaurants()),
      foodItems: this.loadResource('food items', this.api.listFoodItems())
    }).pipe(finalize(() => this.loading.set(false))).subscribe(({ users, restaurants, foodItems }) => {
      this.users.set(users);
      this.restaurants.set(restaurants);
      this.foodItems.set(foodItems);
    });
  }

  protected loadOrders(): void {
    this.orderError.set('');

    this.api.listOrders().subscribe({
      next: orders => this.orders.set(orders),
      error: (error: Error) => {
        this.orders.set([]);
        this.orderError.set(error.message);
      }
    });
  }

  protected createUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.save(() => this.api.createUser(this.userForm.getRawValue()), user => {
      this.users.update(users => [user, ...users]);
      this.userForm.reset();
      this.notice.set('User created');
    });
  }

  protected createRestaurant(): void {
    if (this.restaurantForm.invalid) {
      this.restaurantForm.markAllAsTouched();
      return;
    }

    this.save(() => this.api.createRestaurant(this.restaurantForm.getRawValue()), restaurant => {
      this.restaurants.update(restaurants => [restaurant, ...restaurants]);
      this.restaurantForm.reset();
      this.notice.set('Restaurant created');
    });
  }

  protected createFoodItem(): void {
    if (this.foodItemForm.invalid) {
      this.foodItemForm.markAllAsTouched();
      return;
    }

    this.save(() => this.api.createFoodItem(this.foodItemForm.getRawValue()), foodItem => {
      this.foodItems.update(foodItems => [foodItem, ...foodItems]);
      this.foodItemForm.reset({ restaurantId: 0, name: '', description: '', category: '', price: 0 });
      this.notice.set('Food item created');
    });
  }

  protected addToCart(foodItem: FoodItem): void {
    const selectedRestaurant = this.selectedRestaurant();

    if (!selectedRestaurant) {
      this.error.set('Select a restaurant before adding items.');
      return;
    }

    this.placedOrder.set(null);
    this.cartItems.update(items => {
      const existing = items.find(item => item.foodItemId === foodItem.id);
      if (existing) {
        return items.map(item =>
          item.foodItemId === foodItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...items,
        {
          restaurantId: selectedRestaurant.id,
          foodItemId: foodItem.id,
          foodItemName: foodItem.name,
          quantity: 1,
          unitPrice: Number(foodItem.price)
        }
      ];
    });
  }

  protected updateCartQuantity(foodItemId: number, change: number): void {
    this.cartItems.update(items =>
      items
        .map(item => (item.foodItemId === foodItemId ? { ...item, quantity: item.quantity + change } : item))
        .filter(item => item.quantity > 0)
    );
  }

  protected placeConsumerOrder(): void {
    const selectedRestaurant = this.selectedRestaurant();
    const user = this.auth.user();

    if (!selectedRestaurant || !user || this.cartItems().length === 0) {
      this.error.set('Sign in and add at least one item to the cart before placing an order.');
      return;
    }

    const request: CreateOrderRequest = {
      userId: user.id,
      restaurantId: selectedRestaurant.id,
      items: this.cartItems().map(({ restaurantId, ...item }) => item)
    };

    this.save(() => this.api.createOrder(request), order => {
      this.orders.update(orders => [order, ...orders]);
      this.cartItems.set([]);
      this.placedOrder.set(order);
      this.notice.set('Order placed');
    });
  }

  protected addAdminOrderItem(): void {
    const { foodItemId, quantity } = this.adminOrderForm.getRawValue();
    const foodItem = this.foodItems().find(item => item.id === Number(foodItemId));

    if (!foodItem || quantity < 1) {
      this.adminOrderForm.controls.foodItemId.markAsTouched();
      this.adminOrderForm.controls.quantity.markAsTouched();
      return;
    }

    this.adminOrderItems.update(items => [
      ...items,
      {
        foodItemId: foodItem.id,
        foodItemName: foodItem.name,
        quantity,
        unitPrice: Number(foodItem.price)
      }
    ]);
    this.adminOrderForm.patchValue({ foodItemId: 0, quantity: 1 });
  }

  protected removeAdminOrderItem(index: number): void {
    this.adminOrderItems.update(items => items.filter((_, itemIndex) => itemIndex !== index));
  }

  protected createAdminOrder(): void {
    const { userId, restaurantId } = this.adminOrderForm.getRawValue();

    if (userId < 1 || restaurantId < 1 || this.adminOrderItems().length === 0) {
      this.adminOrderForm.controls.userId.markAsTouched();
      this.adminOrderForm.controls.restaurantId.markAsTouched();
      this.error.set('Select a user, restaurant, and at least one order item.');
      return;
    }

    const request: CreateOrderRequest = {
      userId,
      restaurantId,
      items: this.adminOrderItems()
    };

    this.save(() => this.api.createOrder(request), order => {
      this.orders.update(orders => [order, ...orders]);
      this.adminOrderItems.set([]);
      this.adminOrderForm.reset({ userId: 0, restaurantId: 0, foodItemId: 0, quantity: 1 });
      this.notice.set('Order created');
    });
  }

  protected restaurantName(restaurantId: number): string {
    return this.restaurants().find(restaurant => restaurant.id === restaurantId)?.name ?? `Restaurant #${restaurantId}`;
  }

  protected userName(userId: number): string {
    const user = this.users().find(candidate => candidate.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User #${userId}`;
  }

  private save<T>(request: () => Observable<T>, onSuccess: (value: T) => void): void {
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    request()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: onSuccess,
        error: (error: Error) => this.error.set(error.message)
      });
  }

  private completeAuthentication(response: import('./core/models').AuthenticationResponse): void {
    this.auth.start(response);
    this.loginForm.reset();
    this.registerForm.reset();
    this.notice.set(`Welcome, ${response.user.firstName}.`);
    if (this.auth.isAdmin()) {
      this.loadAdminData();
    }
  }

  private loadResource<T>(resourceName: string, request: Observable<T[]>): Observable<T[]> {
    return request.pipe(
      catchError((error: Error) => {
        this.error.update(current =>
          [current, `Could not load ${resourceName}: ${error.message}`].filter(Boolean).join(' ')
        );
        return of([]);
      })
    );
  }
}
