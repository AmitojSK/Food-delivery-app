package com.fooddelivery.orderservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateOrderItemRequest(
        @NotNull(message = "Food item id is required")
        Long foodItemId,

        @NotBlank(message = "Food item name is required")
        @Size(max = 140, message = "Food item name must be at most 140 characters")
        String foodItemName,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity,

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be greater than zero")
        BigDecimal unitPrice
) {
}
