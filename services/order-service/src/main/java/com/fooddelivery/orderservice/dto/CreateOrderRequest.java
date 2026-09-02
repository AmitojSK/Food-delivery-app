package com.fooddelivery.orderservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateOrderRequest(
        @NotNull(message = "User id is required")
        Long userId,

        @NotNull(message = "Restaurant id is required")
        Long restaurantId,

        @NotBlank(message = "Delivery address is required")
        @Size(max = 300, message = "Delivery address must be at most 300 characters")
        String deliveryAddress,

        @NotBlank(message = "Contact name is required")
        @Size(max = 160, message = "Contact name must be at most 160 characters")
        String contactName,

        @NotBlank(message = "Contact phone number is required")
        @Pattern(regexp = "^[0-9+\\-() ]{7,20}$", message = "Contact phone number must be valid")
        String contactPhone,

        @Valid
        @NotEmpty(message = "At least one order item is required")
        List<CreateOrderItemRequest> items
) {
}
