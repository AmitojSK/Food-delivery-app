package com.fooddelivery.deliveryservice.event;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class DeliveryEventPublisherTest {

    private final KafkaTemplate<String, Object> kafkaTemplate = mock(KafkaTemplate.class);
    private final DeliveryEventPublisher publisher =
            new DeliveryEventPublisher(kafkaTemplate, "delivery.events.v1");

    @Test
    void publishesDeliveryCreatedForAPendingDeliveryThatHasNoDriverYet() {
        // A freshly-created delivery is PENDING with driverId == null. Regression guard:
        // Map.of rejects null values, so publishing this used to throw NPE and roll back
        // the whole createDelivery transaction, so no delivery was ever persisted.
        Delivery delivery = mock(Delivery.class);
        when(delivery.getId()).thenReturn(42L);
        when(delivery.getOrderId()).thenReturn("order-1");
        when(delivery.getDriverId()).thenReturn(null);
        when(delivery.getStatus()).thenReturn(DeliveryStatus.PENDING);

        assertThatCode(() -> publisher.publish(delivery, "DeliveryCreated")).doesNotThrowAnyException();

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq("delivery.events.v1"), eq("order-1"), payload.capture());

        Map<String, Object> event = (Map<String, Object>) payload.getValue();
        assertThat(event.get("eventType")).isEqualTo("DeliveryCreated");
        assertThat(event.get("aggregateId")).isEqualTo("42");

        Map<String, Object> data = (Map<String, Object>) event.get("data");
        assertThat(data).containsKey("driverId");
        assertThat(data.get("driverId")).isNull();
        assertThat(data.get("status")).isEqualTo("PENDING");
    }
}
