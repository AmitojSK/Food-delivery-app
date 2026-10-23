package com.fooddelivery.restaurantservice.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.kafka.core.KafkaTemplate;

class RestaurantEventPublisherTest {

    @Test
    @SuppressWarnings("unchecked")
    void publishesRestaurantDeletedEnvelopeKeyedByRestaurantId() {
        KafkaTemplate<String, Object> kafkaTemplate = Mockito.mock(KafkaTemplate.class);
        RestaurantEventPublisher publisher = new RestaurantEventPublisher(kafkaTemplate, "restaurant.events.v1");

        publisher.publishRestaurantDeleted(42L);

        ArgumentCaptor<String> topic = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> value = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(topic.capture(), key.capture(), value.capture());

        assertThat(topic.getValue()).isEqualTo("restaurant.events.v1");
        assertThat(key.getValue()).isEqualTo("42");

        Map<String, Object> envelope = (Map<String, Object>) value.getValue();
        assertThat(envelope.get("eventType")).isEqualTo("RestaurantDeleted");
        assertThat(envelope.get("eventId")).isNotNull();
        assertThat(envelope.get("aggregateId")).isEqualTo("42");

        Map<String, Object> data = (Map<String, Object>) envelope.get("data");
        assertThat(data.get("restaurantId")).isEqualTo(42L);
    }
}
