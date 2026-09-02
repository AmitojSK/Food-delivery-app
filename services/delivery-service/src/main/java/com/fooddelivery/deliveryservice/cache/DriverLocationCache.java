package com.fooddelivery.deliveryservice.cache;

import java.time.Instant;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

/**
 * Short-lived driver location, keyed by driver id (Redis key: driver-location:v1:{driverId}
 * via the "driverLocations" cache name + spring.cache.redis.time-to-live). This is
 * deliberately Redis-only: a cache miss means "no location reported recently" rather than
 * falling back to a database read, so the key's TTL doubles as a driver-availability signal.
 * {@link #remember} always overwrites so callers never need to evict.
 */
@Component
public class DriverLocationCache {

    public record DriverLocationView(Long driverId, Double latitude, Double longitude, Instant updatedAt) {
    }

    @CachePut(cacheNames = "driverLocations", key = "#driverId")
    public DriverLocationView remember(Long driverId, Double latitude, Double longitude) {
        return new DriverLocationView(driverId, latitude, longitude, Instant.now());
    }

    @Cacheable(cacheNames = "driverLocations", key = "#driverId")
    public DriverLocationView find(Long driverId) {
        return null;
    }
}
