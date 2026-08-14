package com.fooddelivery.foodcatalogueservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateFoodItemRequest(
        @Size(max = 140, message = "Food item name must be at most 140 characters")
        String name,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description,

        @Size(max = 80, message = "Category must be at most 80 characters")
        String category,

        @DecimalMin(value = "0.01", message = "Price must be greater than zero")
        BigDecimal price,

        Boolean available
) {
}
