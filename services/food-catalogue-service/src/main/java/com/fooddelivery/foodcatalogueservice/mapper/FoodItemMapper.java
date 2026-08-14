package com.fooddelivery.foodcatalogueservice.mapper;

import com.fooddelivery.foodcatalogueservice.dto.CreateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.dto.FoodItemResponse;
import com.fooddelivery.foodcatalogueservice.entity.FoodItem;
import org.springframework.stereotype.Component;

@Component
public class FoodItemMapper {

    public FoodItem toEntity(CreateFoodItemRequest request) {
        FoodItem foodItem = new FoodItem();
        foodItem.setRestaurantId(request.restaurantId());
        foodItem.setName(request.name().trim());
        foodItem.setDescription(request.description() == null ? null : request.description().trim());
        foodItem.setCategory(request.category().trim());
        foodItem.setPrice(request.price());
        return foodItem;
    }

    public FoodItemResponse toResponse(FoodItem foodItem) {
        return new FoodItemResponse(
                foodItem.getId(),
                foodItem.getRestaurantId(),
                foodItem.getName(),
                foodItem.getDescription(),
                foodItem.getCategory(),
                foodItem.getPrice(),
                foodItem.isAvailable(),
                foodItem.getCreatedAt(),
                foodItem.getUpdatedAt()
        );
    }
}
