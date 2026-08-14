package com.fooddelivery.foodcatalogueservice.repository;

import com.fooddelivery.foodcatalogueservice.entity.FoodItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    List<FoodItem> findByRestaurantId(Long restaurantId);

    List<FoodItem> findByRestaurantIdAndAvailable(Long restaurantId, boolean available);

    List<FoodItem> findByRestaurantIdAndCategoryIgnoreCase(Long restaurantId, String category);
}
