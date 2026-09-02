package com.fooddelivery.apigateway.ratelimit;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.net.InetSocketAddress;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitKeyResolverTest {

    private static final String SECRET = "c3ByaW5nLWJvb3QtdXNlci1zZXJ2aWNlLXRlc3Qtc2VjcmV0LTIwMjY=";
    private final RateLimitKeyResolver keyResolver = new RateLimitKeyResolver(SECRET);

    @Test
    void keysAnAuthenticatedRequestByRouteAndJwtSubject() {
        String token = signedTokenFor("customer@example.com");
        ServerWebExchange exchange = exchangeWithRoute("order-service-checkout",
                MockServerHttpRequest.post("/orders").header("Authorization", "Bearer " + token));

        String key = keyResolver.resolve(exchange).block();

        assertThat(key).isEqualTo("order-service-checkout:customer@example.com");
    }

    @Test
    void fallsBackToRemoteAddressWhenNoTokenIsPresent() {
        ServerWebExchange exchange = exchangeWithRoute("user-service-auth",
                MockServerHttpRequest.post("/auth/login")
                        .remoteAddress(new InetSocketAddress("203.0.113.7", 54321)));

        String key = keyResolver.resolve(exchange).block();

        assertThat(key).isEqualTo("user-service-auth:203.0.113.7");
    }

    @Test
    void fallsBackToRemoteAddressWhenTokenIsInvalid() {
        ServerWebExchange exchange = exchangeWithRoute("delivery-service-accept",
                MockServerHttpRequest.post("/deliveries/1/accept").header("Authorization", "Bearer garbage"));

        String key = keyResolver.resolve(exchange).block();

        assertThat(key).startsWith("delivery-service-accept:");
        assertThat(key).doesNotContain("garbage");
    }

    private String signedTokenFor(String subject) {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET));
        return Jwts.builder().subject(subject).signWith(key).compact();
    }

    private ServerWebExchange exchangeWithRoute(String routeId, MockServerHttpRequest.BaseBuilder<?> requestBuilder) {
        MockServerWebExchange exchange = MockServerWebExchange.from(requestBuilder.build());
        exchange.getAttributes().put(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR, testRoute(routeId));
        return exchange;
    }

    private Route testRoute(String id) {
        return Route.async().id(id).uri("lb://TEST-SERVICE").predicate(exchange -> true).build();
    }
}
