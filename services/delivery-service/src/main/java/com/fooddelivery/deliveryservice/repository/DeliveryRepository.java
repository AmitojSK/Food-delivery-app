package com.fooddelivery.deliveryservice.repository;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByOrderId(String orderId);

    List<Delivery> findByDriverId(Long driverId);

    List<Delivery> findByDriverIdAndStatus(Long driverId, DeliveryStatus status);

    List<Delivery> findByStatus(DeliveryStatus status);

    List<Delivery> findByRestaurantId(Long restaurantId);
}
