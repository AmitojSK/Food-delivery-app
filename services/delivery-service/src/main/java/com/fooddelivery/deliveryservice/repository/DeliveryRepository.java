package com.fooddelivery.deliveryservice.repository;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByOrderId(String orderId);

    List<Delivery> findByDriverId(Long driverId);

    List<Delivery> findByDriverIdAndStatus(Long driverId, DeliveryStatus status);

    List<Delivery> findByStatus(DeliveryStatus status);

    List<Delivery> findByRestaurantId(Long restaurantId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Delivery d set d.driverId = :driverId, d.status = 'ASSIGNED', d.assignedAt = CURRENT_TIMESTAMP "
            + "where d.id = :id and d.status = 'PENDING' and d.driverId is null")
    int assignPendingDelivery(@Param("id") Long id, @Param("driverId") Long driverId);
}
