export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'CUSTOMER' | 'ADMIN' | 'RESTAURANT_OWNER' | 'DELIVERY_PARTNER';
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
  role: string;
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

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Delivery {
  id: number;
  orderId: string;
  restaurantId: number;
  driverId: number | null;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  driverLatitude: number | null;
  driverLongitude: number | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatus;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: Record<string, string>;
}
