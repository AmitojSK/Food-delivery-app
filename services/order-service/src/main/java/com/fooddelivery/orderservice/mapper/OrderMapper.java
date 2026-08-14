package com.fooddelivery.orderservice.mapper;

import com.fooddelivery.orderservice.dto.CreateOrderItemRequest;
import com.fooddelivery.orderservice.dto.CreateOrderRequest;
import com.fooddelivery.orderservice.dto.OrderItemResponse;
import com.fooddelivery.orderservice.dto.OrderResponse;
import com.fooddelivery.orderservice.entity.Order;
import com.fooddelivery.orderservice.entity.OrderItem;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class OrderMapper {

    public Order toEntity(CreateOrderRequest request, BigDecimal deliveryFee) {
        Order order = new Order();
        order.setUserId(request.userId());
        order.setRestaurantId(request.restaurantId());
        order.setItems(request.items().stream().map(this::toEntity).toList());

        BigDecimal subtotal = order.getItems().stream()
                .map(OrderItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setTotalAmount(subtotal.add(deliveryFee));
        return order;
    }

    public OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getUserId(),
                order.getRestaurantId(),
                order.getStatus(),
                order.getItems().stream().map(this::toResponse).toList(),
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    private OrderItem toEntity(CreateOrderItemRequest request) {
        OrderItem item = new OrderItem();
        item.setFoodItemId(request.foodItemId());
        item.setFoodItemName(request.foodItemName().trim());
        item.setQuantity(request.quantity());
        item.setUnitPrice(request.unitPrice());
        item.setLineTotal(request.unitPrice().multiply(BigDecimal.valueOf(request.quantity())));
        return item;
    }

    private OrderItemResponse toResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getFoodItemId(),
                item.getFoodItemName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal()
        );
    }
}
