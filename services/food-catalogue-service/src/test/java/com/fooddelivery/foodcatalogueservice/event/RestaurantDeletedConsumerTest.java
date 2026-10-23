package com.fooddelivery.foodcatalogueservice.event;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fooddelivery.foodcatalogueservice.service.FoodItemService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RestaurantDeletedConsumerTest {

    @Mock
    FoodItemService foodItemService;
    @Mock
    ProcessedEventRepository processedEventRepository;
    @InjectMocks
    RestaurantDeletedConsumer consumer;

    private ConsumerRecord<String, Map<String, Object>> record(String eventId, String eventType, Long restaurantId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("restaurantId", restaurantId);
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("data", data);
        return new ConsumerRecord<>("restaurant.events.v1", 0, 0L, String.valueOf(restaurantId), envelope);
    }

    @Test
    void deletesOrphanedItemsAndRecordsTheEvent() {
        when(processedEventRepository.existsById("e1")).thenReturn(false);

        consumer.consume(record("e1", "RestaurantDeleted", 7L));

        verify(foodItemService).deleteByRestaurant(7L);
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void skipsAnAlreadyProcessedEvent() {
        when(processedEventRepository.existsById("e1")).thenReturn(true);

        consumer.consume(record("e1", "RestaurantDeleted", 7L));

        verify(foodItemService, never()).deleteByRestaurant(anyLong());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void ignoresOtherEventTypesButStillRecordsThem() {
        when(processedEventRepository.existsById("e2")).thenReturn(false);

        consumer.consume(record("e2", "RestaurantUpdated", 7L));

        verify(foodItemService, never()).deleteByRestaurant(anyLong());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }
}
