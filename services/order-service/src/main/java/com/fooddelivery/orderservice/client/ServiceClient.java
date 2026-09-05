package com.fooddelivery.orderservice.client;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class ServiceClient {

    private final WebClient restaurantClient;
    private final WebClient catalogueClient;

    public ServiceClient(
            WebClient.Builder webClientBuilder,
            @Value("${RESTAURANT_SERVICE_URI:http://restaurant-service:8082}") String restaurantServiceUri,
            @Value("${FOOD_CATALOGUE_SERVICE_URI:http://food-catalogue-service:8083}") String foodCatalogueServiceUri
    ) {
        this.restaurantClient = webClientBuilder.clone()
                .baseUrl(restaurantServiceUri)
                .build();
        this.catalogueClient = webClientBuilder.clone()
                .baseUrl(foodCatalogueServiceUri)
                .build();
    }

    public RestaurantResponse getRestaurant(Long id) {
        return restaurantClient.get()
                .uri("/api/v1/restaurants/{id}", id)
                .headers(headers -> forwardAuthorization(headers))
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, response -> Mono.empty())
                .bodyToMono(RestaurantResponse.class)
                .block();
    }

    public FoodItemResponse getFoodItem(Long id) {
        return catalogueClient.get()
                .uri("/api/v1/food-items/{id}", id)
                .headers(headers -> forwardAuthorization(headers))
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, response -> Mono.empty())
                .bodyToMono(FoodItemResponse.class)
                .block();
    }

    private void forwardAuthorization(org.springframework.http.HttpHeaders headers) {
        var attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String authorization = request.getHeader("Authorization");
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
        }
    }
}
