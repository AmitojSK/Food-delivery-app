package com.fooddelivery.orderservice.dto;

import com.fooddelivery.orderservice.entity.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        String id,
        Long userId,
        Long restaurantId,
        OrderStatus status,
        List<OrderItemResponse> items,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal totalAmount,
        Instant createdAt,
        Instant updatedAt
) {
}
