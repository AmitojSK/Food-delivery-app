package com.fooddelivery.userservice.dto;

import java.time.Instant;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        String role,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
