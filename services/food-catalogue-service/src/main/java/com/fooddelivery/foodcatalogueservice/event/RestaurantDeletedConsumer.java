package com.fooddelivery.foodcatalogueservice.event;

import com.fooddelivery.foodcatalogueservice.service.FoodItemService;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consumes {@code restaurant.events.v1} and, on {@code RestaurantDeleted}, removes the menu items
 * that referenced the gone restaurant. The restaurant lives in another service/database with no
 * cross-service foreign key, so there is no {@code ON DELETE CASCADE} — this event-driven cleanup is
 * what keeps the catalogue consistent. Idempotent via the inbox, so an at-least-once redelivery is a
 * no-op. The inbox write and the item deletion share one transaction, so the event is only marked
 * processed if the deletion committed.
 */
@Component
public class RestaurantDeletedConsumer {

    private static final Logger log = LoggerFactory.getLogger(RestaurantDeletedConsumer.class);

    private final FoodItemService foodItemService;
    private final ProcessedEventRepository processedEventRepository;

    public RestaurantDeletedConsumer(FoodItemService foodItemService,
                                     ProcessedEventRepository processedEventRepository) {
        this.foodItemService = foodItemService;
        this.processedEventRepository = processedEventRepository;
    }

    @KafkaListener(topics = "${app.kafka.topics.restaurant-events}")
    @Transactional
    public void consume(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> envelope = record.value();
        String eventId = (String) envelope.get("eventId");
        if (eventId == null || processedEventRepository.existsById(eventId)) {
            return;
        }
        // Other event types may share this topic later; only act on deletions.
        if ("RestaurantDeleted".equals(envelope.get("eventType"))) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) envelope.get("data");
            Number restaurantId = (Number) data.get("restaurantId");
            if (restaurantId != null) {
                int removed = foodItemService.deleteByRestaurant(restaurantId.longValue());
                log.info("RestaurantDeleted({}) → removed {} orphaned food item(s)", restaurantId, removed);
            }
        }
        processedEventRepository.save(new ProcessedEvent(eventId));
    }
}
