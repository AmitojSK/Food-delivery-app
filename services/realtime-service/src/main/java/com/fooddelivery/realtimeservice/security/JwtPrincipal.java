package com.fooddelivery.realtimeservice.security;

public record JwtPrincipal(Long userId, String email) {
}
