package com.fooddelivery.restaurantservice.mapper;

import com.fooddelivery.restaurantservice.dto.CreateRestaurantRequest;
import com.fooddelivery.restaurantservice.dto.RestaurantResponse;
import com.fooddelivery.restaurantservice.entity.Restaurant;
import org.springframework.stereotype.Component;

@Component
public class RestaurantMapper {

    public Restaurant toEntity(CreateRestaurantRequest request) {
        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.name().trim());
        restaurant.setCuisineType(request.cuisineType().trim());
        restaurant.setStreetAddress(request.streetAddress().trim());
        restaurant.setCity(request.city().trim());
        restaurant.setState(request.state().trim());
        restaurant.setPostalCode(request.postalCode().trim());
        restaurant.setContactEmail(request.contactEmail().trim().toLowerCase());
        restaurant.setContactPhone(request.contactPhone().trim());
        return restaurant;
    }

    public RestaurantResponse toResponse(Restaurant restaurant) {
        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getCuisineType(),
                restaurant.getStreetAddress(),
                restaurant.getCity(),
                restaurant.getState(),
                restaurant.getPostalCode(),
                restaurant.getContactEmail(),
                restaurant.getContactPhone(),
                restaurant.isActive(),
                restaurant.getOwnerId(),
                restaurant.getCreatedAt(),
                restaurant.getUpdatedAt()
        );
    }
}
