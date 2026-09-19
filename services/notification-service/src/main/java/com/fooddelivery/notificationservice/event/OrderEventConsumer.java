package com.fooddelivery.notificationservice.event;

import com.fooddelivery.notificationservice.sse.SseHub;
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
            Number userId = (Number) data.get("userId");
            if (userId == null) return;
            hub.publish(userId.longValue(), "order-status", Map.of(
                    "orderId", String.valueOf(data.getOrDefault("orderId", "")),
                    "status", String.valueOf(data.getOrDefault("status", "")),
                    "occurredAt", String.valueOf(envelope.getOrDefault("occurredAt", ""))));
        } catch (Exception e) {
            log.warn("Skipping order event that could not be fanned out over SSE", e);
        }
    }
}
