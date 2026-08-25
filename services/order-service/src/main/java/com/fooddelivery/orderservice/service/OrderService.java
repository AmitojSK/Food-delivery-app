package com.fooddelivery.orderservice.service;

import com.fooddelivery.orderservice.client.FoodItemResponse;
import com.fooddelivery.orderservice.client.RestaurantResponse;
import com.fooddelivery.orderservice.client.ServiceClient;
import com.fooddelivery.orderservice.dto.CreateOrderItemRequest;
import com.fooddelivery.orderservice.dto.CreateOrderRequest;
import com.fooddelivery.orderservice.dto.OrderResponse;
import com.fooddelivery.orderservice.dto.UpdateOrderStatusRequest;
import com.fooddelivery.orderservice.entity.Order;
import com.fooddelivery.orderservice.entity.OrderStatus;
import com.fooddelivery.orderservice.exception.OrderValidationException;
import com.fooddelivery.orderservice.exception.ResourceNotFoundException;
import com.fooddelivery.orderservice.mapper.OrderMapper;
import com.fooddelivery.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final BigDecimal DEFAULT_DELIVERY_FEE = new BigDecimal("30.00");

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final ServiceClient serviceClient;

    public OrderService(OrderRepository orderRepository, OrderMapper orderMapper, ServiceClient serviceClient) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
        this.serviceClient = serviceClient;
    }

    public OrderResponse createOrder(CreateOrderRequest request) {
        validateRestaurant(request.restaurantId());
        validateFoodItems(request.restaurantId(), request.items());

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

    private void validateRestaurant(Long restaurantId) {
        RestaurantResponse restaurant;
        try {
            restaurant = serviceClient.getRestaurant(restaurantId);
        } catch (Exception e) {
            log.error("Failed to reach restaurant-service for restaurant {}", restaurantId, e);
            throw new OrderValidationException("Unable to verify restaurant. Please try again later.");
        }
        if (restaurant == null) {
            throw new OrderValidationException("Restaurant with id " + restaurantId + " was not found");
        }
        if (!restaurant.active()) {
            throw new OrderValidationException("Restaurant with id " + restaurantId + " is not currently active");
        }
    }

    private void validateFoodItems(Long restaurantId, List<CreateOrderItemRequest> items) {
        for (CreateOrderItemRequest item : items) {
            FoodItemResponse foodItem;
            try {
                foodItem = serviceClient.getFoodItem(item.foodItemId());
            } catch (Exception e) {
                log.error("Failed to reach food-catalogue-service for food item {}", item.foodItemId(), e);
                throw new OrderValidationException("Unable to verify food items. Please try again later.");
            }
            if (foodItem == null) {
                throw new OrderValidationException("Food item with id " + item.foodItemId() + " was not found");
            }
            if (!foodItem.restaurantId().equals(restaurantId)) {
                throw new OrderValidationException(
                        "Food item '" + foodItem.name() + "' does not belong to restaurant " + restaurantId);
            }
            if (!foodItem.available()) {
                throw new OrderValidationException("Food item '" + foodItem.name() + "' is not currently available");
            }
        }
    }
}
