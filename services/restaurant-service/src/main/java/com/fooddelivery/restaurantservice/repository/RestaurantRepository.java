package com.fooddelivery.restaurantservice.repository;

import com.fooddelivery.restaurantservice.entity.Restaurant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    Optional<Restaurant> findByName(String name);

    Optional<Restaurant> findByContactEmail(String contactEmail);

    Optional<Restaurant> findByContactPhone(String contactPhone);

    List<Restaurant> findByCityIgnoreCase(String city);

    List<Restaurant> findByActive(boolean active);

    List<Restaurant> findByCityIgnoreCaseAndActive(String city, boolean active);

    List<Restaurant> findByOwnerId(Long ownerId);
}
