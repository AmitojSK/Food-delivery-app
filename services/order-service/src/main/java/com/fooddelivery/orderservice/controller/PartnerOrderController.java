package com.fooddelivery.orderservice.controller;

import com.fooddelivery.orderservice.dto.OrderResponse;
import com.fooddelivery.orderservice.dto.UpdateOrderStatusRequest;
import com.fooddelivery.orderservice.entity.OrderStatus;
import com.fooddelivery.orderservice.service.OrderService;
import com.fooddelivery.orderservice.security.OrderSecurity;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/partner/orders")
@PreAuthorize("hasRole('RESTAURANT_OWNER')")
public class PartnerOrderController {

    private final OrderService orderService;
    private final OrderSecurity orderSecurity;

    public PartnerOrderController(OrderService orderService, OrderSecurity orderSecurity) {
        this.orderService = orderService;
        this.orderSecurity = orderSecurity;
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> listOrdersByRestaurant(
            @RequestParam Long restaurantId,
            @RequestParam(required = false) OrderStatus status,
            Authentication authentication
    ) {
        return ResponseEntity.ok(orderService.listOrdersByRestaurant(
                restaurantId, orderSecurity.currentUserId(authentication), status));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable String id,
            @RequestParam Long restaurantId,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatusForRestaurant(
                id, restaurantId, orderSecurity.currentUserId(authentication), request));
    }
}
