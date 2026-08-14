package com.fooddelivery.foodcatalogueservice.service;

import com.fooddelivery.foodcatalogueservice.dto.CreateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.dto.FoodItemResponse;
import com.fooddelivery.foodcatalogueservice.dto.UpdateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.entity.FoodItem;
import com.fooddelivery.foodcatalogueservice.exception.ResourceNotFoundException;
import com.fooddelivery.foodcatalogueservice.mapper.FoodItemMapper;
import com.fooddelivery.foodcatalogueservice.repository.FoodItemRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FoodItemService {

    private final FoodItemRepository foodItemRepository;
    private final FoodItemMapper foodItemMapper;

    public FoodItemService(FoodItemRepository foodItemRepository, FoodItemMapper foodItemMapper) {
        this.foodItemRepository = foodItemRepository;
        this.foodItemMapper = foodItemMapper;
    }

    @Transactional
    public FoodItemResponse createFoodItem(CreateFoodItemRequest request) {
        return foodItemMapper.toResponse(foodItemRepository.save(foodItemMapper.toEntity(request)));
    }

    @Transactional(readOnly = true)
    public FoodItemResponse getFoodItem(Long id) {
        return foodItemMapper.toResponse(findFoodItem(id));
    }

    @Transactional(readOnly = true)
    public List<FoodItemResponse> listFoodItems(Long restaurantId, Boolean available, String category) {
        List<FoodItem> foodItems;
        if (category != null && restaurantId != null) {
            foodItems = foodItemRepository.findByRestaurantIdAndCategoryIgnoreCase(restaurantId, category.trim());
        } else if (available != null && restaurantId != null) {
            foodItems = foodItemRepository.findByRestaurantIdAndAvailable(restaurantId, available);
        } else if (restaurantId != null) {
            foodItems = foodItemRepository.findByRestaurantId(restaurantId);
        } else {
            foodItems = foodItemRepository.findAll();
        }

        return foodItems.stream()
                .map(foodItemMapper::toResponse)
                .toList();
    }

    @Transactional
    public FoodItemResponse updateFoodItem(Long id, UpdateFoodItemRequest request) {
        FoodItem foodItem = findFoodItem(id);

        if (request.name() != null) {
            foodItem.setName(request.name().trim());
        }
        if (request.description() != null) {
            foodItem.setDescription(request.description().trim());
        }
        if (request.category() != null) {
            foodItem.setCategory(request.category().trim());
        }
        if (request.price() != null) {
            foodItem.setPrice(request.price());
        }
        if (request.available() != null) {
            foodItem.setAvailable(request.available());
        }

        return foodItemMapper.toResponse(foodItem);
    }

    private FoodItem findFoodItem(Long id) {
        return foodItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food item with id " + id + " was not found"));
    }
}
