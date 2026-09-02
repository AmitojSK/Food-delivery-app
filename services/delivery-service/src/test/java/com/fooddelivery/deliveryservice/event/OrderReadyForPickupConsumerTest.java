package com.fooddelivery.deliveryservice.event;

import com.fooddelivery.deliveryservice.dto.CreateDeliveryRequest;
import com.fooddelivery.deliveryservice.exception.DeliveryValidationException;
import com.fooddelivery.deliveryservice.service.DeliveryService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrderReadyForPickupConsumerTest {

    private final DeliveryService deliveryService = mock(DeliveryService.class);
    private final ProcessedEventRepository processedEventRepository = mock(ProcessedEventRepository.class);
    private final OrderReadyForPickupConsumer consumer =
            new OrderReadyForPickupConsumer(deliveryService, processedEventRepository);

    @Test
    void createsADeliveryOnFirstDeliveryOfTheEvent() {
        when(processedEventRepository.existsById("event-1")).thenReturn(false);

        consumer.consume(record("event-1", "OrderReadyForPickup"));

        verify(deliveryService).createDelivery(any(CreateDeliveryRequest.class));
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void skipsAlreadyProcessedEventsWithoutTouchingTheDeliveryService() {
        when(processedEventRepository.existsById("event-1")).thenReturn(true);

        consumer.consume(record("event-1", "OrderReadyForPickup"));

        verify(deliveryService, never()).createDelivery(any());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void ignoresEventTypesItDoesNotHandle() {
        when(processedEventRepository.existsById("event-1")).thenReturn(false);

        consumer.consume(record("event-1", "OrderConfirmed"));

        verify(deliveryService, never()).createDelivery(any());
    }

    @Test
    void redeliveryThatRacesAConcurrentCreateStillMarksTheEventProcessed() {
        when(processedEventRepository.existsById("event-1")).thenReturn(false);
        when(deliveryService.createDelivery(any())).thenThrow(new DeliveryValidationException("already exists"));

        consumer.consume(record("event-1", "OrderReadyForPickup"));

        verify(processedEventRepository, times(1)).save(any(ProcessedEvent.class));
    }

    private ConsumerRecord<String, Map<String, Object>> record(String eventId, String eventType) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderId", "order-1");
        data.put("restaurantId", 1);
        data.put("pickupAddress", "12 MG Road");
        data.put("deliveryAddress", "45 Church St");

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("data", data);

        return new ConsumerRecord<>("order.events.v1", 0, 0, "order-1", envelope);
    }
}
