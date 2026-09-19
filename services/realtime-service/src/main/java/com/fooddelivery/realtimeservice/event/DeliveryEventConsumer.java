package com.fooddelivery.realtimeservice.event;

import com.fooddelivery.realtimeservice.sse.SseHub;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes delivery lifecycle events and broadcasts them to every connected
 * delivery partner. The available-jobs board is open to all drivers, so a new
 * PENDING job (DeliveryCreated) or a job being taken (DeliveryAssigned) is
 * relevant to all of them, not to one user. Parsing is fully defensive.
 */
@Component
public class DeliveryEventConsumer {
    private static final Logger log = LoggerFactory.getLogger(DeliveryEventConsumer.class);
    private static final String DRIVER_ROLE = "DELIVERY_PARTNER";
    private final SseHub hub;

    public DeliveryEventConsumer(SseHub hub) {
        this.hub = hub;
    }

    @KafkaListener(topics = "${app.kafka.topics.delivery-events}")
    @SuppressWarnings("unchecked")
    public void consume(ConsumerRecord<String, Map<String, Object>> record) {
        try {
            Map<String, Object> envelope = record.value();
            if (envelope == null) return;
            Map<String, Object> data = (Map<String, Object>) envelope.get("data");
            if (data == null) return;
            hub.publishToRole(DRIVER_ROLE, "delivery-status", Map.of(
                    "deliveryId", String.valueOf(data.getOrDefault("deliveryId", "")),
                    "orderId", String.valueOf(data.getOrDefault("orderId", "")),
                    "status", String.valueOf(data.getOrDefault("status", "")),
                    "occurredAt", String.valueOf(envelope.getOrDefault("occurredAt", ""))));
        } catch (Exception e) {
            log.warn("Skipping delivery event that could not be fanned out over SSE", e);
        }
    }
}
