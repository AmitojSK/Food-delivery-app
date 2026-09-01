package com.fooddelivery.deliveryservice.dto;

import java.time.Instant;

public record DeliveryResponse(
        Long id,
        String orderId,
        Long restaurantId,
        Long driverId,
        String status,
        String pickupAddress,
        String deliveryAddress,
        Double driverLatitude,
        Double driverLongitude,
        Instant assignedAt,
        Instant pickedUpAt,
        Instant deliveredAt,
        Instant createdAt,
        Instant updatedAt
) {
}
