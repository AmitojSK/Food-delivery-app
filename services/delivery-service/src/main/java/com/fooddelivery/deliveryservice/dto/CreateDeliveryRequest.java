package com.fooddelivery.deliveryservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDeliveryRequest(
        @NotBlank(message = "Order ID is required")
        String orderId,

        @NotNull(message = "Restaurant ID is required")
        Long restaurantId,

        @NotBlank(message = "Pickup address is required")
        String pickupAddress,

        String deliveryAddress
) {
}
