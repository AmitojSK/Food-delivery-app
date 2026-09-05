package com.fooddelivery.foodcatalogueservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Plain (non-load-balanced) {@link WebClient.Builder}.
 *
 * <p>This builder is deliberately <em>not</em> annotated {@code @LoadBalanced}. That annotation
 * installs a Spring Cloud LoadBalancer filter which treats the request URL's host as a service ID
 * to resolve through service discovery rather than as a real hostname. Outside of Eureka that
 * breaks every call: a concrete host such as {@code restaurant-service-xxxx.onrender.com} would be
 * looked up as a service name, found in no registry, and fail.</p>
 *
 * <p>Discovery is not used in deployed environments (platform DNS provides stable addresses) and is
 * not needed locally either, since Docker Compose resolves container names on its own network. So
 * targets are configured as ordinary absolute URLs instead.</p>
 */
@Configuration
public class WebClientConfig {
    @Bean
    WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
