package com.fooddelivery.foodcatalogueservice.config;

import io.netty.channel.ChannelOption;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

/**
 * Plain (non-load-balanced) {@link WebClient.Builder} with bounded timeouts.
 *
 * <p>Not {@code @LoadBalanced}: that filter treats the request URL's host as a discovery service id,
 * which breaks against the concrete {@code *_SERVICE_URI} hostnames used in deployment (and the
 * Compose DNS names locally). Targets are ordinary absolute URLs instead.</p>
 *
 * <p><b>Timeouts</b> bound how long the inter-service call to restaurant-service can block the
 * request thread — the first line of defence against a slow dependency exhausting the thread pool.
 * They are deliberately generous (defaults: 10s connect / 30s response) so a free-tier cold start
 * can still answer; a genuinely down or hung dependency is handled by the circuit breaker on
 * {@code RestaurantClient}.</p>
 */
@Configuration
public class WebClientConfig {

    @Bean
    WebClient.Builder webClientBuilder(
            @Value("${INTER_SERVICE_CONNECT_TIMEOUT_MS:10000}") int connectTimeoutMs,
            @Value("${INTER_SERVICE_RESPONSE_TIMEOUT_MS:30000}") int responseTimeoutMs) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .responseTimeout(Duration.ofMillis(responseTimeoutMs));
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }
}
