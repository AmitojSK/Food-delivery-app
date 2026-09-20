package com.fooddelivery.restaurantservice.dto;

import java.io.Serializable;
import java.time.Instant;

// Serializable so Spring's Redis cache (JDK serialization) can store it; the
// cache is cache-aside and fails open, but without this every write threw.
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
) implements Serializable {
}
