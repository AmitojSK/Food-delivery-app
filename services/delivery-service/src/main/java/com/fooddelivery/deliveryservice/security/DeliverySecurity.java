package com.fooddelivery.deliveryservice.security;

import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("deliverySecurity")
public class DeliverySecurity {
    private final DeliveryRepository deliveryRepository;

    public DeliverySecurity(DeliveryRepository deliveryRepository) {
        this.deliveryRepository = deliveryRepository;
    }

    public boolean canReadDelivery(Long deliveryId, Authentication authentication) {
        if (isAdmin(authentication)) return true;
        Long driverId = currentUserId(authentication);
        return deliveryRepository.findById(deliveryId)
                .map(delivery -> delivery.getStatus().name().equals("PENDING") || driverId.equals(delivery.getDriverId()))
                .orElse(false);
    }

    public boolean canReadOrderDelivery(String orderId, Authentication authentication) {
        if (isAdmin(authentication)) return true;
        Long driverId = currentUserId(authentication);
        return deliveryRepository.findByOrderId(orderId)
                .map(delivery -> delivery.getStatus().name().equals("PENDING") || driverId.equals(delivery.getDriverId()))
                .orElse(false);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            return null;
        }
        return userId;
    }
}
