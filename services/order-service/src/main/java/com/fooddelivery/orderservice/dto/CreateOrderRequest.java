package com.fooddelivery.orderservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateOrderRequest(
        @NotNull(message = "User id is required")
        Long userId,

        @NotNull(message = "Restaurant id is required")
        Long restaurantId,

        @Valid
        @NotEmpty(message = "At least one order item is required")
        List<CreateOrderItemRequest> items
) {
}
