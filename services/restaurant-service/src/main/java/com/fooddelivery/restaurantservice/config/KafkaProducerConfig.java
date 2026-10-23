package com.fooddelivery.restaurantservice.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * restaurant-service only <em>produces</em> events (it has no consumers), so all it needs beyond the
 * auto-configured {@code KafkaTemplate} is to provision the topic it publishes to. The broker has
 * auto-topic-creation disabled, so the topic (and its dead-letter partner, used by consumers) must
 * be declared explicitly. Disabled in tests, where no broker is available to provision against.
 */
@Configuration
@ConditionalOnProperty(name = "app.kafka.provision-topics", havingValue = "true", matchIfMissing = true)
public class KafkaProducerConfig {

    @Bean
    NewTopic restaurantEventsTopic(@Value("${app.kafka.topics.restaurant-events}") String topic) {
        return TopicBuilder.name(topic).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic restaurantEventsDeadLetterTopic(@Value("${app.kafka.topics.restaurant-events}") String topic) {
        return TopicBuilder.name(topic + ".DLT").partitions(3).replicas(1).build();
    }
}
