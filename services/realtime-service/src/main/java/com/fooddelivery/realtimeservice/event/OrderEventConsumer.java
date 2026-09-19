package com.fooddelivery.realtimeservice.event;

import com.fooddelivery.realtimeservice.sse.SseHub;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes order lifecycle events and pushes each one to the ordering customer's
 * live SSE stream. Only OrderStatusChanged is relevant here; OrderReadyForPickup
 * (consumed by delivery-service) is ignored. Parsing is fully defensive so a
 * single malformed record can never break the stream fan-out.
 */
@Component
public class OrderEventConsumer {
    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);
    private final SseHub hub;

    public OrderEventConsumer(SseHub hub) {
        this.hub = hub;
    }

    @KafkaListener(topics = "${app.kafka.topics.order-events}")
    @SuppressWarnings("unchecked")
    public void consume(ConsumerRecord<String, Map<String, Object>> record) {
        try {
            Map<String, Object> envelope = record.value();
            if (envelope == null || !"OrderStatusChanged".equals(envelope.get("eventType"))) return;
            Map<String, Object> data = (Map<String, Object>) envelope.get("data");
            if (data == null) return;

            Map<String, Object> payload = Map.of(
                    "orderId", String.valueOf(data.getOrDefault("orderId", "")),
                    "restaurantId", String.valueOf(data.getOrDefault("restaurantId", "")),
                    "status", String.valueOf(data.getOrDefault("status", "")),
                    "occurredAt", String.valueOf(envelope.getOrDefault("occurredAt", "")));

            // The same event matters to two people: the ordering customer ("your order")
            // and the restaurant owner ("an order for your restaurant"). Fan out to both;
            // each app opens its own per-user stream and interprets the payload in context.
            Number userId = (Number) data.get("userId");
            if (userId != null) hub.publish(userId.longValue(), "order-status", payload);

            Number ownerId = (Number) data.get("ownerId");
            if (ownerId != null && !ownerId.equals(userId)) {
                hub.publish(ownerId.longValue(), "order-status", payload);
            }
        } catch (Exception e) {
            log.warn("Skipping order event that could not be fanned out over SSE", e);
        }
    }
}
