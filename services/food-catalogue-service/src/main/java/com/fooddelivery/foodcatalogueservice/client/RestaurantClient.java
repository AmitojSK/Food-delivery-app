package com.fooddelivery.foodcatalogueservice.client;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class RestaurantClient {
    private final WebClient client;

    public RestaurantClient(WebClient.Builder builder) {
        client = builder.baseUrl("http://RESTAURANT-SERVICE").build();
    }

    public RestaurantOwnership getRestaurant(Long restaurantId) {
        return client.get().uri("/api/v1/restaurants/{id}", restaurantId).retrieve()
                .bodyToMono(RestaurantOwnership.class).block();
    }

    public record RestaurantOwnership(Long id, Long ownerId) { }
}
