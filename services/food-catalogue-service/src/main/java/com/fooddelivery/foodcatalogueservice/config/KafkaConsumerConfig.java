package com.fooddelivery.foodcatalogueservice.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConsumerConfig {

    @Bean
    DefaultErrorHandler kafkaErrorHandler(
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${app.kafka.retry.backoff-ms:1000}") long backoffMillis,
            @Value("${app.kafka.retry.max-attempts:3}") long maxAttempts) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, exception) -> new TopicPartition(record.topic() + ".DLT", record.partition()));
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
                recoverer, new FixedBackOff(backoffMillis, Math.max(0, maxAttempts - 1)));
        errorHandler.addNotRetryableExceptions(IllegalArgumentException.class);
        return errorHandler;
    }

    // Broker has auto-topic-creation disabled, so the topic this service consumes from and its
    // dead-letter partner must be provisioned explicitly. Disabled in tests, where there is no broker.
    @Configuration
    @ConditionalOnProperty(name = "app.kafka.provision-topics", havingValue = "true", matchIfMissing = true)
    static class TopicProvisioningConfig {

        @Bean
        NewTopic restaurantEventsTopic(@Value("${app.kafka.topics.restaurant-events}") String topic) {
            return TopicBuilder.name(topic).partitions(3).replicas(1).build();
        }

        @Bean
        NewTopic restaurantEventsDeadLetterTopic(@Value("${app.kafka.topics.restaurant-events}") String topic) {
            return TopicBuilder.name(topic + ".DLT").partitions(3).replicas(1).build();
        }
    }
}
