package com.fooddelivery.restaurantservice.dto;

import java.time.Instant;

public record RestaurantResponse(
        Long id,
        String name,
        String cuisineType,
        String streetAddress,
        String city,
        String state,
        String postalCode,
        String contactEmail,
        String contactPhone,
        boolean active,
        Long ownerId,
        Instant createdAt,
        Instant updatedAt
) {
}
