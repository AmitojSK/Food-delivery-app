package com.fooddelivery.foodcatalogueservice.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

// Serializable so Spring's Redis cache (JDK serialization) can store it; the
// cache is cache-aside and fails open, but without this every write threw.
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
) implements Serializable {
}
