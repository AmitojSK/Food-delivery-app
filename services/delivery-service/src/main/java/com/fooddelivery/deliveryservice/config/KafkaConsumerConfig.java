package com.fooddelivery.deliveryservice.config;

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

    // Broker has auto-topic-creation disabled, so every topic this service produces to,
    // consumes from, or dead-letters into must be provisioned explicitly. Disabled in tests,
    // where no broker is available to provision against.
    @Configuration
    @ConditionalOnProperty(name = "app.kafka.provision-topics", havingValue = "true", matchIfMissing = true)
    static class TopicProvisioningConfig {

        @Bean
        NewTopic orderEventsTopic(@Value("${app.kafka.topics.order-events}") String topic) {
            return TopicBuilder.name(topic).partitions(3).replicas(1).build();
        }

        @Bean
        NewTopic orderEventsDeadLetterTopic(@Value("${app.kafka.topics.order-events}") String topic) {
            return TopicBuilder.name(topic + ".DLT").partitions(3).replicas(1).build();
        }

        @Bean
        NewTopic deliveryEventsTopic(@Value("${app.kafka.topics.delivery-events}") String topic) {
            return TopicBuilder.name(topic).partitions(3).replicas(1).build();
        }

        @Bean
        NewTopic deliveryEventsDeadLetterTopic(@Value("${app.kafka.topics.delivery-events}") String topic) {
            return TopicBuilder.name(topic + ".DLT").partitions(3).replicas(1).build();
        }
    }
}
