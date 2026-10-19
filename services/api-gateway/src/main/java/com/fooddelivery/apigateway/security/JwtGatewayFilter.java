package com.fooddelivery.apigateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class JwtGatewayFilter implements GlobalFilter, Ordered {
    private final SecretKey signingKey;

    public JwtGatewayFilter(@Value("${security.jwt.secret}") String secret) {
        signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (isPublic(exchange)) {
            return chain.filter(exchange);
        }

        String authorization = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ") || !isValid(authorization.substring(7))) {
            return unauthorized(exchange);
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private boolean isPublic(ServerWebExchange exchange) {
        String path = exchange.getRequest().getPath().value();
        // Public without a JWT:
        //  - the gateway's own health/info, and each backend's health/info (so the UI
        //    "wake services" warm-up can reach and wake a cold instance);
        //  - the auth endpoints (login/register/oauth2 providers);
        //  - the OAuth2 social-login redirect + callback endpoints (the browser hits these
        //    before it has a token; user-service drives the flow and issues our JWT).
        if (path.equals("/actuator/health") || path.equals("/actuator/info")
                || path.endsWith("-api/actuator/health") || path.endsWith("-api/actuator/info")
                || path.startsWith("/user-api/api/v1/auth/")
                || path.startsWith("/user-api/oauth2/")
                || path.startsWith("/user-api/login/oauth2/")) {
            return true;
        }
        return exchange.getRequest().getMethod() == HttpMethod.GET
                && (path.startsWith("/restaurant-api/api/v1/restaurants")
                || path.startsWith("/catalogue-api/api/v1/food-items"));
    }

    private boolean isValid(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            return claims.getSubject() != null && claims.get("role", String.class) != null;
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        byte[] body = "{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"A valid Bearer token is required\"}"
                .getBytes(StandardCharsets.UTF_8);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
    }
}
