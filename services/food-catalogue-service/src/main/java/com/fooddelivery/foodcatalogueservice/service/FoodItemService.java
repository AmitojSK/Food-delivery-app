package com.fooddelivery.foodcatalogueservice.service;

import com.fooddelivery.foodcatalogueservice.dto.CreateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.dto.FoodItemResponse;
import com.fooddelivery.foodcatalogueservice.dto.UpdateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.entity.FoodItem;
import com.fooddelivery.foodcatalogueservice.exception.ResourceNotFoundException;
import com.fooddelivery.foodcatalogueservice.mapper.FoodItemMapper;
import com.fooddelivery.foodcatalogueservice.repository.FoodItemRepository;
import com.fooddelivery.foodcatalogueservice.client.RestaurantClient;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FoodItemService {

    private final FoodItemRepository foodItemRepository;
    private final FoodItemMapper foodItemMapper;
    private final RestaurantClient restaurantClient;

    public FoodItemService(FoodItemRepository foodItemRepository, FoodItemMapper foodItemMapper, RestaurantClient restaurantClient) {
        this.foodItemRepository = foodItemRepository;
        this.foodItemMapper = foodItemMapper;
        this.restaurantClient = restaurantClient;
    }

    @Transactional
    @CacheEvict(cacheNames = "foodItemLists", allEntries = true)
    public FoodItemResponse createFoodItem(CreateFoodItemRequest request, Long ownerId) {
        requireOwnership(request.restaurantId(), ownerId);
        return createFoodItem(request);
    }

    @Transactional
    @CacheEvict(cacheNames = "foodItemLists", allEntries = true)
    public FoodItemResponse createFoodItem(CreateFoodItemRequest request) {
        return foodItemMapper.toResponse(foodItemRepository.save(foodItemMapper.toEntity(request)));
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "foodItems", key = "#id")
    public FoodItemResponse getFoodItem(Long id) {
        return foodItemMapper.toResponse(findFoodItem(id));
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "foodItemLists", key = "{#restaurantId, #available, #category}")
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

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "foodItemLists", key = "'owner:' + #restaurantId + ':' + #ownerId")
    public List<FoodItemResponse> listOwnedFoodItems(Long restaurantId, Long ownerId) {
        requireOwnership(restaurantId, ownerId);
        return listFoodItems(restaurantId, null, null);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "foodItems", key = "#id"),
            @CacheEvict(cacheNames = "foodItemLists", allEntries = true)
    })
    public FoodItemResponse updateFoodItem(Long id, UpdateFoodItemRequest request, Long ownerId) {
        FoodItem foodItem = findFoodItem(id);
        requireOwnership(foodItem.getRestaurantId(), ownerId);
        return applyUpdate(foodItem, request);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "foodItems", key = "#id"),
            @CacheEvict(cacheNames = "foodItemLists", allEntries = true)
    })
    public FoodItemResponse updateFoodItem(Long id, UpdateFoodItemRequest request) {
        return applyUpdate(findFoodItem(id), request);
    }

    private FoodItemResponse applyUpdate(FoodItem foodItem, UpdateFoodItemRequest request) {

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

    private void requireOwnership(Long restaurantId, Long ownerId) {
        RestaurantClient.RestaurantOwnership restaurant = restaurantClient.getRestaurant(restaurantId);
        if (restaurant == null || restaurant.ownerId() == null || !restaurant.ownerId().equals(ownerId)) {
            throw new ResourceNotFoundException("Restaurant with id " + restaurantId + " was not found");
        }
    }
}
