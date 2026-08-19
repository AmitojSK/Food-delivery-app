package com.fooddelivery.foodcatalogueservice.controller;

import com.fooddelivery.foodcatalogueservice.dto.CreateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.dto.FoodItemResponse;
import com.fooddelivery.foodcatalogueservice.dto.UpdateFoodItemRequest;
import com.fooddelivery.foodcatalogueservice.service.FoodItemService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/food-items")
public class FoodItemController {

    private final FoodItemService foodItemService;

    public FoodItemController(FoodItemService foodItemService) {
        this.foodItemService = foodItemService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FoodItemResponse> createFoodItem(@Valid @RequestBody CreateFoodItemRequest request) {
        FoodItemResponse foodItem = foodItemService.createFoodItem(request);
        return ResponseEntity.created(URI.create("/api/v1/food-items/" + foodItem.id())).body(foodItem);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FoodItemResponse> getFoodItem(@PathVariable Long id) {
        return ResponseEntity.ok(foodItemService.getFoodItem(id));
    }

    @GetMapping
    public ResponseEntity<List<FoodItemResponse>> listFoodItems(
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) Boolean available,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(foodItemService.listFoodItems(restaurantId, available, category));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FoodItemResponse> updateFoodItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFoodItemRequest request
    ) {
        return ResponseEntity.ok(foodItemService.updateFoodItem(id, request));
    }
}
