package com.fooddelivery.notificationservice.security;

public record JwtPrincipal(Long userId, String email) {
}
