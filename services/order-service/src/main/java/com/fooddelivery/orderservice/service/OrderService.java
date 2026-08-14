package com.fooddelivery.orderservice.service;

import com.fooddelivery.orderservice.dto.CreateOrderRequest;
import com.fooddelivery.orderservice.dto.OrderResponse;
import com.fooddelivery.orderservice.dto.UpdateOrderStatusRequest;
import com.fooddelivery.orderservice.entity.Order;
import com.fooddelivery.orderservice.entity.OrderStatus;
import com.fooddelivery.orderservice.exception.ResourceNotFoundException;
import com.fooddelivery.orderservice.mapper.OrderMapper;
import com.fooddelivery.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private static final BigDecimal DEFAULT_DELIVERY_FEE = new BigDecimal("30.00");

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    public OrderService(OrderRepository orderRepository, OrderMapper orderMapper) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
    }

    public OrderResponse createOrder(CreateOrderRequest request) {
        Order order = orderMapper.toEntity(request, DEFAULT_DELIVERY_FEE);
        return orderMapper.toResponse(orderRepository.save(order));
    }

    public OrderResponse getOrder(String id) {
        return orderMapper.toResponse(findOrder(id));
    }

    public List<OrderResponse> listOrders(Long userId, Long restaurantId, OrderStatus status) {
        List<Order> orders;
        if (userId != null) {
            orders = orderRepository.findByUserId(userId);
        } else if (restaurantId != null) {
            orders = orderRepository.findByRestaurantId(restaurantId);
        } else if (status != null) {
            orders = orderRepository.findByStatus(status);
        } else {
            orders = orderRepository.findAll();
        }

        return orders.stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    public OrderResponse updateOrderStatus(String id, UpdateOrderStatusRequest request) {
        Order order = findOrder(id);
        order.setStatus(request.status());
        return orderMapper.toResponse(orderRepository.save(order));
    }

    private Order findOrder(String id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order with id " + id + " was not found"));
    }
}
