package com.fooddelivery.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @Size(max = 80, message = "First name must be at most 80 characters")
        String firstName,

        @Size(max = 80, message = "Last name must be at most 80 characters")
        String lastName,

        @Email(message = "Email must be valid")
        @Size(max = 160, message = "Email must be at most 160 characters")
        String email,

        @Pattern(regexp = "^[0-9+\\-() ]{7,20}$", message = "Phone number must be valid")
        String phoneNumber,

        Boolean active
) {
}
