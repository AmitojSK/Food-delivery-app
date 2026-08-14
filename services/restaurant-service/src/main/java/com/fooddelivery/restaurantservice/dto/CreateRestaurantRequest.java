package com.fooddelivery.restaurantservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateRestaurantRequest(
        @NotBlank(message = "Restaurant name is required")
        @Size(max = 140, message = "Restaurant name must be at most 140 characters")
        String name,

        @NotBlank(message = "Cuisine type is required")
        @Size(max = 80, message = "Cuisine type must be at most 80 characters")
        String cuisineType,

        @NotBlank(message = "Street address is required")
        @Size(max = 200, message = "Street address must be at most 200 characters")
        String streetAddress,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City must be at most 100 characters")
        String city,

        @NotBlank(message = "State is required")
        @Size(max = 100, message = "State must be at most 100 characters")
        String state,

        @NotBlank(message = "Postal code is required")
        @Size(max = 20, message = "Postal code must be at most 20 characters")
        String postalCode,

        @NotBlank(message = "Contact email is required")
        @Email(message = "Contact email must be valid")
        @Size(max = 160, message = "Contact email must be at most 160 characters")
        String contactEmail,

        @NotBlank(message = "Contact phone is required")
        @Pattern(regexp = "^[0-9+\\-() ]{7,20}$", message = "Contact phone must be valid")
        String contactPhone
) {
}
