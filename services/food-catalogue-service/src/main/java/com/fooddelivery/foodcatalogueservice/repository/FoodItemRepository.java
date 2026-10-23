package com.fooddelivery.foodcatalogueservice.repository;

import com.fooddelivery.foodcatalogueservice.entity.FoodItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    List<FoodItem> findByRestaurantId(Long restaurantId);

    List<FoodItem> findByRestaurantIdAndAvailable(Long restaurantId, boolean available);

    List<FoodItem> findByRestaurantIdAndCategoryIgnoreCase(Long restaurantId, String category);

    // Bulk-remove every menu item for a restaurant (used when a RestaurantDeleted event arrives).
    // Returns the number of rows deleted. Must run inside a transaction (the caller is @Transactional).
    @Modifying
    @Query("delete from FoodItem f where f.restaurantId = :restaurantId")
    int deleteByRestaurantId(@Param("restaurantId") Long restaurantId);
}
