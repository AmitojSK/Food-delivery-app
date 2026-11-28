package com.fooddelivery.foodcatalogueservice.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class RestaurantClient {
    private final WebClient client;

    public RestaurantClient(
            WebClient.Builder builder,
            @Value("${RESTAURANT_SERVICE_URI:http://restaurant-service:8082}") String restaurantServiceUri
    ) {
        client = builder.baseUrl(restaurantServiceUri).build();
    }

    @CircuitBreaker(name = "restaurant-service")
    public RestaurantOwnership getRestaurant(Long restaurantId) {
        return client.get().uri("/api/v1/restaurants/{id}", restaurantId).retrieve()
                .bodyToMono(RestaurantOwnership.class).block();
    }

    public record RestaurantOwnership(Long id, Long ownerId) { }
}
