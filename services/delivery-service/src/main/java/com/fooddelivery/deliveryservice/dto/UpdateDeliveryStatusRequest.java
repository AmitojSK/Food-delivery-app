package com.fooddelivery.deliveryservice.dto;

import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateDeliveryStatusRequest(
        @NotNull(message = "Status is required")
        DeliveryStatus status
) {
}
