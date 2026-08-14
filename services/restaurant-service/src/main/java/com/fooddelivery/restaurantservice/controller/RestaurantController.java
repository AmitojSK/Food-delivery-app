package com.fooddelivery.restaurantservice.controller;

import com.fooddelivery.restaurantservice.dto.CreateRestaurantRequest;
import com.fooddelivery.restaurantservice.dto.RestaurantResponse;
import com.fooddelivery.restaurantservice.dto.UpdateRestaurantRequest;
import com.fooddelivery.restaurantservice.service.RestaurantService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @PostMapping
    public ResponseEntity<RestaurantResponse> createRestaurant(@Valid @RequestBody CreateRestaurantRequest request) {
        RestaurantResponse restaurant = restaurantService.createRestaurant(request);
        return ResponseEntity.created(URI.create("/api/v1/restaurants/" + restaurant.id())).body(restaurant);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantResponse> getRestaurant(@PathVariable Long id) {
        return ResponseEntity.ok(restaurantService.getRestaurant(id));
    }

    @GetMapping
    public ResponseEntity<List<RestaurantResponse>> listRestaurants(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Boolean active
    ) {
        return ResponseEntity.ok(restaurantService.listRestaurants(city, active));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RestaurantResponse> updateRestaurant(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRestaurantRequest request
    ) {
        return ResponseEntity.ok(restaurantService.updateRestaurant(id, request));
    }
}
