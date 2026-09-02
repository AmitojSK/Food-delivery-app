package com.fooddelivery.deliveryservice.event;

import com.fooddelivery.deliveryservice.entity.Delivery;
import java.time.Instant;
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
        kafkaTemplate.send(topic, delivery.getOrderId(), Map.of(
                "eventId", eventId, "eventType", eventType, "eventVersion", 1,
                "aggregateId", delivery.getId().toString(), "correlationId", delivery.getOrderId(),
                "causationId", eventId, "occurredAt", Instant.now().toString(),
                "data", Map.of("deliveryId", delivery.getId(), "orderId", delivery.getOrderId(),
                        "driverId", delivery.getDriverId(), "status", delivery.getStatus().name())));
    }
}
