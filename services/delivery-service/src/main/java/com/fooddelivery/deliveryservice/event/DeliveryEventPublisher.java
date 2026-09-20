package com.fooddelivery.deliveryservice.event;

import com.fooddelivery.deliveryservice.entity.Delivery;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class DeliveryEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String topic;

    public DeliveryEventPublisher(KafkaTemplate<String, Object> kafkaTemplate,
                                  @Value("${app.kafka.topics.delivery-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publish(Delivery delivery, String eventType) {
        String eventId = UUID.randomUUID().toString();
        // A newly-created delivery is PENDING with no driver yet, so driverId is null here.
        // Map.of rejects null values, so build the payload with a null-tolerant map.
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("deliveryId", delivery.getId());
        data.put("orderId", delivery.getOrderId());
        data.put("driverId", delivery.getDriverId());
        data.put("status", delivery.getStatus().name());

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventId", eventId);
        event.put("eventType", eventType);
        event.put("eventVersion", 1);
        event.put("aggregateId", delivery.getId().toString());
        event.put("correlationId", delivery.getOrderId());
        event.put("causationId", eventId);
        event.put("occurredAt", Instant.now().toString());
        event.put("data", data);

        kafkaTemplate.send(topic, delivery.getOrderId(), event);
    }
}
