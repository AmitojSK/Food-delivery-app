package com.fooddelivery.orderservice.event;

import com.fooddelivery.orderservice.service.OrderService;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class DeliveryEventConsumer {
    private final OrderService orderService;
    private final ProcessedEventRepository processedEventRepository;

    public DeliveryEventConsumer(OrderService orderService, ProcessedEventRepository processedEventRepository) {
        this.orderService = orderService;
        this.processedEventRepository = processedEventRepository;
    }

    @KafkaListener(topics = "${app.kafka.topics.delivery-events}")
    @SuppressWarnings("unchecked")
    public void consume(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> envelope = record.value();
        String eventId = (String) envelope.get("eventId");
        if (eventId == null || processedEventRepository.existsById(eventId)) return;
        String eventType = (String) envelope.get("eventType");
        if (!"DeliveryPickedUp".equals(eventType) && !"DeliveryCompleted".equals(eventType)) return;
        Map<String, Object> data = (Map<String, Object>) envelope.get("data");
        orderService.applyDeliveryEvent((String) data.get("orderId"), eventType);
        processedEventRepository.save(new ProcessedEvent(eventId));
    }
}
