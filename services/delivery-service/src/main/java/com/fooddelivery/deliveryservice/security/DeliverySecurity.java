package com.fooddelivery.deliveryservice.security;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Authorization rules for reading a delivery.
 *
 * <p>A delivery may be read by:</p>
 * <ul>
 *   <li>an ADMIN;</li>
 *   <li>the customer who placed the order (order tracking);</li>
 *   <li>the driver it is assigned to;</li>
 *   <li>any delivery partner while it is still {@code PENDING}, since an unassigned delivery is an
 *       open job offer that drivers must be able to see in order to accept it.</li>
 * </ul>
 *
 * <p>The {@code PENDING} allowance is deliberately scoped to the {@code DELIVERY_PARTNER} role.
 * It previously applied to <em>any</em> authenticated principal, which exposed the pickup and
 * delivery addresses of every unassigned delivery to any logged-in account.</p>
 *
 * <p>Deliveries created before {@code customer_id} existed, and those created through the ADMIN
 * endpoint, have a null customer and are therefore readable by no customer at all — failing
 * closed rather than open.</p>
 */
@Component("deliverySecurity")
public class DeliverySecurity {
    private final DeliveryRepository deliveryRepository;

    public DeliverySecurity(DeliveryRepository deliveryRepository) {
        this.deliveryRepository = deliveryRepository;
    }

    public boolean canReadDelivery(Long deliveryId, Authentication authentication) {
        return canRead(deliveryRepository.findById(deliveryId), authentication);
    }

    public boolean canReadOrderDelivery(String orderId, Authentication authentication) {
        return canRead(deliveryRepository.findByOrderId(orderId), authentication);
    }

    private boolean canRead(Optional<Delivery> maybeDelivery, Authentication authentication) {
        if (isAdmin(authentication)) return true;
        Long userId = currentUserId(authentication);
        if (userId == null) return false;
        return maybeDelivery
                .map(delivery -> userId.equals(delivery.getCustomerId())
                        || userId.equals(delivery.getDriverId())
                        || (delivery.getStatus() == com.fooddelivery.deliveryservice.entity.DeliveryStatus.PENDING
                            && hasRole(authentication, "ROLE_DELIVERY_PARTNER")))
                .orElse(false);
    }

    private boolean isAdmin(Authentication authentication) {
        return hasRole(authentication, "ROLE_ADMIN");
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals(role));
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            return null;
        }
        return userId;
    }
}
