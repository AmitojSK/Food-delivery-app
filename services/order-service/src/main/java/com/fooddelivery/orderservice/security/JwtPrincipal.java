package com.fooddelivery.orderservice.security;

public record JwtPrincipal(Long userId, String email) {
}
