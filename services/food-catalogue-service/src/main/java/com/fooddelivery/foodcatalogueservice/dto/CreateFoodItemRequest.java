package com.fooddelivery.foodcatalogueservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateFoodItemRequest(
        @NotNull(message = "Restaurant id is required")
        Long restaurantId,

        @NotBlank(message = "Food item name is required")
        @Size(max = 140, message = "Food item name must be at most 140 characters")
        String name,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description,

        @NotBlank(message = "Category is required")
        @Size(max = 80, message = "Category must be at most 80 characters")
        String category,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than zero")
        BigDecimal price
) {
}
