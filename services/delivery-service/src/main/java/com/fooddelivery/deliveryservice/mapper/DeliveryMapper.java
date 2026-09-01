package com.fooddelivery.deliveryservice.mapper;

import com.fooddelivery.deliveryservice.dto.CreateDeliveryRequest;
import com.fooddelivery.deliveryservice.dto.DeliveryResponse;
import com.fooddelivery.deliveryservice.entity.Delivery;
import org.springframework.stereotype.Component;

@Component
public class DeliveryMapper {

    public Delivery toEntity(CreateDeliveryRequest request) {
        Delivery delivery = new Delivery();
        delivery.setOrderId(request.orderId());
        delivery.setRestaurantId(request.restaurantId());
        delivery.setPickupAddress(request.pickupAddress().trim());
        delivery.setDeliveryAddress(request.deliveryAddress() != null ? request.deliveryAddress().trim() : "");
        return delivery;
    }

    public DeliveryResponse toResponse(Delivery delivery) {
        return new DeliveryResponse(
                delivery.getId(),
                delivery.getOrderId(),
                delivery.getRestaurantId(),
                delivery.getDriverId(),
                delivery.getStatus().name(),
                delivery.getPickupAddress(),
                delivery.getDeliveryAddress(),
                delivery.getDriverLatitude(),
                delivery.getDriverLongitude(),
                delivery.getAssignedAt(),
                delivery.getPickedUpAt(),
                delivery.getDeliveredAt(),
                delivery.getCreatedAt(),
                delivery.getUpdatedAt()
        );
    }
}
