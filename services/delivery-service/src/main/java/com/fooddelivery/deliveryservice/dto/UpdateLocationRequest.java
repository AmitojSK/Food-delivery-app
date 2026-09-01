package com.fooddelivery.deliveryservice.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateLocationRequest(
        @NotNull(message = "Latitude is required")
        Double latitude,

        @NotNull(message = "Longitude is required")
        Double longitude
) {
}
