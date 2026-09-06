package com.fooddelivery.deliveryservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDeliveryRequest(
        @NotBlank(message = "Order ID is required")
        String orderId,

        @NotNull(message = "Restaurant ID is required")
        Long restaurantId,

        /**
         * Customer who placed the order. Optional: supplied by the OrderReadyForPickup consumer,
         * absent for deliveries created directly through the ADMIN endpoint.
         */
        Long customerId,

        @NotBlank(message = "Pickup address is required")
        String pickupAddress,

        String deliveryAddress
) {
}
