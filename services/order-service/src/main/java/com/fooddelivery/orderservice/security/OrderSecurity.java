package com.fooddelivery.orderservice.security;

import com.fooddelivery.orderservice.repository.OrderRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("orderSecurity")
public class OrderSecurity {
    private final OrderRepository orderRepository;

    public OrderSecurity(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public boolean isCurrentUser(Long userId, Authentication authentication) {
        return principal(authentication).map(principal -> principal.userId().equals(userId)).orElse(false);
    }

    public boolean canAccessOrder(String orderId, Authentication authentication) {
        if (isAdmin(authentication)) return true;
        return principal(authentication).flatMap(principal -> orderRepository.findById(orderId)
                .map(order -> order.getUserId().equals(principal.userId()))).orElse(false);
    }

    public Long currentUserId(Authentication authentication) {
        return principal(authentication).map(JwtPrincipal::userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user ID is missing"));
    }

    public boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    private java.util.Optional<JwtPrincipal> principal(Authentication authentication) {
        return authentication != null && authentication.getPrincipal() instanceof JwtPrincipal principal
                ? java.util.Optional.of(principal) : java.util.Optional.empty();
    }
}
