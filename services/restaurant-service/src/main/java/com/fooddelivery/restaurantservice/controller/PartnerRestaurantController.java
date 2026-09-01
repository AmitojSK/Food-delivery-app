package com.fooddelivery.restaurantservice.controller;

import com.fooddelivery.restaurantservice.dto.CreateRestaurantRequest;
import com.fooddelivery.restaurantservice.dto.RestaurantResponse;
import com.fooddelivery.restaurantservice.dto.UpdateRestaurantRequest;
import com.fooddelivery.restaurantservice.service.RestaurantService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/partner/restaurants")
@PreAuthorize("hasRole('RESTAURANT_OWNER')")
public class PartnerRestaurantController {

    private final RestaurantService restaurantService;

    public PartnerRestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @PostMapping
    public ResponseEntity<RestaurantResponse> createRestaurant(
            @Valid @RequestBody CreateRestaurantRequest request,
            Authentication authentication
    ) {
        Long ownerId = (Long) authentication.getPrincipal();
        RestaurantResponse restaurant = restaurantService.createRestaurant(request, ownerId);
        return ResponseEntity.created(URI.create("/api/v1/partner/restaurants/" + restaurant.id())).body(restaurant);
    }

    @GetMapping
    public ResponseEntity<List<RestaurantResponse>> listMyRestaurants(Authentication authentication) {
        Long ownerId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(restaurantService.listByOwner(ownerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantResponse> getRestaurant(@PathVariable Long id) {
        return ResponseEntity.ok(restaurantService.getRestaurant(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RestaurantResponse> updateRestaurant(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRestaurantRequest request,
            Authentication authentication
    ) {
        Long ownerId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(restaurantService.updateOwnedRestaurant(id, ownerId, request));
    }
}
