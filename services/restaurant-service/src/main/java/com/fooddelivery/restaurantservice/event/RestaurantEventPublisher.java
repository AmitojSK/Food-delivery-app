package com.fooddelivery.restaurantservice.event;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes restaurant lifecycle events to {@code restaurant.events.v1}, using the same versioned
 * envelope shape as the order and delivery streams ({@code eventId}, {@code eventType}, …, {@code
 * data}). Currently only {@code RestaurantDeleted}, which food-catalogue-service consumes to remove
 * the now-orphaned menu items for that restaurant (there is no cross-service foreign key, so this is
 * how referential integrity is kept — at the application layer, over events).
 *
 * <p>Like delivery-service's publisher this is a direct, fire-and-forget send (not a transactional
 * outbox). The consumer is idempotent, so an at-least-once delivery is safe; the residual risk of a
 * direct publish — the row commits but the send is lost — leaves a recoverable orphan, not a
 * correctness bug, which is an acceptable trade-off here.</p>
 */
@Component
public class RestaurantEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String topic;

    public RestaurantEventPublisher(KafkaTemplate<String, Object> kafkaTemplate,
                                    @Value("${app.kafka.topics.restaurant-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publishRestaurantDeleted(Long restaurantId) {
        String eventId = UUID.randomUUID().toString();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("restaurantId", restaurantId);

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventId", eventId);
        event.put("eventType", "RestaurantDeleted");
        event.put("eventVersion", 1);
        event.put("aggregateId", String.valueOf(restaurantId));
        event.put("correlationId", String.valueOf(restaurantId));
        event.put("causationId", eventId);
        event.put("occurredAt", Instant.now().toString());
        event.put("data", data);

        // Key by restaurant id so all events for one restaurant land on the same partition (ordering).
        kafkaTemplate.send(topic, String.valueOf(restaurantId), event);
    }
}
