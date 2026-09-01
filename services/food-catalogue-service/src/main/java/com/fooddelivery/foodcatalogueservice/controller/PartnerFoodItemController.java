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
@RequestMapping("/api/v1/partner/food-items")
@PreAuthorize("hasRole('RESTAURANT_OWNER')")
public class PartnerFoodItemController {

    private final FoodItemService foodItemService;

    public PartnerFoodItemController(FoodItemService foodItemService) {
        this.foodItemService = foodItemService;
    }

    @PostMapping
    public ResponseEntity<FoodItemResponse> createFoodItem(@Valid @RequestBody CreateFoodItemRequest request) {
        FoodItemResponse foodItem = foodItemService.createFoodItem(request);
        return ResponseEntity.created(URI.create("/api/v1/partner/food-items/" + foodItem.id())).body(foodItem);
    }

    @GetMapping
    public ResponseEntity<List<FoodItemResponse>> listFoodItems(@RequestParam Long restaurantId) {
        return ResponseEntity.ok(foodItemService.listFoodItems(restaurantId, null, null));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<FoodItemResponse> updateFoodItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFoodItemRequest request
    ) {
        return ResponseEntity.ok(foodItemService.updateFoodItem(id, request));
    }
}
