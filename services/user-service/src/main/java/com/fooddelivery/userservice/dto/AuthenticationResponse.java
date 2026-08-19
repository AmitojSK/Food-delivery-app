package com.fooddelivery.userservice.dto;

public record AuthenticationResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {
}
