package com.fooddelivery.orderservice.client;

import java.math.BigDecimal;
import java.time.Instant;

public record FoodItemResponse(
        Long id,
        Long restaurantId,
        String name,
        String description,
        String category,
        BigDecimal price,
        boolean available,
        Instant createdAt,
        Instant updatedAt
) {
}
