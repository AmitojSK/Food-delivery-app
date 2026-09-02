package com.fooddelivery.deliveryservice.event;

import com.fooddelivery.deliveryservice.dto.CreateDeliveryRequest;
import com.fooddelivery.deliveryservice.exception.DeliveryValidationException;
import com.fooddelivery.deliveryservice.service.DeliveryService;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderReadyForPickupConsumer {
    private final DeliveryService deliveryService;

    public OrderReadyForPickupConsumer(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @KafkaListener(topics = "${app.kafka.topics.order-events}")
    @SuppressWarnings("unchecked")
    public void consume(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> envelope = record.value();
        if (!"OrderReadyForPickup".equals(envelope.get("eventType"))) return;
        Map<String, Object> data = (Map<String, Object>) envelope.get("data");
        try {
            deliveryService.createDelivery(new CreateDeliveryRequest(
                    (String) data.get("orderId"),
                    ((Number) data.get("restaurantId")).longValue(),
                    (String) data.get("pickupAddress"),
                    (String) data.get("deliveryAddress")));
        } catch (DeliveryValidationException duplicate) {
            // Re-delivery of an already-processed order event is safe and expected.
        }
    }
}
