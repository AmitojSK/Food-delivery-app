export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'CUSTOMER' | 'ADMIN' | 'RESTAURANT_OWNER';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticationResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface Restaurant {
  id: number;
  name: string;
  cuisineType: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRestaurantRequest {
  name: string;
  cuisineType: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
}

export interface FoodItem {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodItemRequest {
  restaurantId: number;
  name: string;
  description: string;
  category: string;
  price: number;
}

export type OrderStatus = 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  foodItemId: number;
  foodItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreateOrderItemRequest {
  foodItemId: number;
  foodItemName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: number;
  restaurantId: number;
  deliveryAddress: string;
  contactName: string;
  contactPhone: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  userId: number;
  restaurantId: number;
  deliveryAddress: string;
  contactName: string;
  contactPhone: string;
  items: CreateOrderItemRequest[];
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: Record<string, string>;
}
