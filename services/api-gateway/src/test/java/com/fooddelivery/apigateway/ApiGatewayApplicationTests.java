package com.fooddelivery.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiGatewayApplicationTests {
    @Autowired
    private WebTestClient webTestClient;

    @Test
    void contextLoads() {
    }

    @Test
    void protectedGatewayRouteRejectsMissingToken() {
        webTestClient.post().uri("/order-api/api/v1/orders")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void protectedGatewayRouteRejectsInvalidToken() {
        webTestClient.post().uri("/order-api/api/v1/orders")
                .header("Authorization", "Bearer invalid-token")
                .exchange()
                .expectStatus().isUnauthorized();
    }
}
