package com.fooddelivery.userservice.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleSignInRequest(
        @NotBlank(message = "idToken is required")
        String idToken
) {
}
