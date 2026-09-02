package com.fooddelivery.apigateway.ratelimit;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * RedisRateLimiter returns 429 without a Retry-After header. Add a conservative fixed
 * hint so throttled clients know to back off instead of retrying immediately.
 */
@Component
public class RetryAfterHeaderFilter implements GlobalFilter, Ordered {

    private static final String RETRY_AFTER_SECONDS = "1";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            ServerHttpResponse response = exchange.getResponse();
            if (response.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS
                    && !response.getHeaders().containsKey(HttpHeaders.RETRY_AFTER)) {
                response.getHeaders().add(HttpHeaders.RETRY_AFTER, RETRY_AFTER_SECONDS);
            }
        }));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
