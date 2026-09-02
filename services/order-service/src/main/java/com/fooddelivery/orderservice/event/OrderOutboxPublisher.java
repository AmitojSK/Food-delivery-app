package com.fooddelivery.orderservice.event;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OrderOutboxPublisher {
    private static final Logger log = LoggerFactory.getLogger(OrderOutboxPublisher.class);
    private final OrderOutboxRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String topic;

    public OrderOutboxPublisher(OrderOutboxRepository outboxRepository, KafkaTemplate<String, Object> kafkaTemplate,
                                @Value("${app.kafka.topics.order-events}") String topic) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    @Scheduled(fixedDelayString = "${app.kafka.outbox-poll-interval-ms:1000}")
    public void publishPendingEvents() {
        for (OrderOutboxEvent event : outboxRepository.findTop100ByPublishedAtIsNullOrderByOccurredAtAsc()) {
            try {
                kafkaTemplate.send(topic, event.getAggregateId(), envelope(event)).get();
                event.setPublishedAt(Instant.now());
                outboxRepository.save(event);
            } catch (Exception exception) {
                log.warn("Kafka publish failed for outbox event {}; it will be retried", event.getId(), exception);
                return;
            }
        }
    }

    private Map<String, Object> envelope(OrderOutboxEvent event) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", event.getId());
        envelope.put("eventType", event.getEventType());
        envelope.put("eventVersion", event.getEventVersion());
        envelope.put("aggregateId", event.getAggregateId());
        envelope.put("correlationId", event.getCorrelationId());
        envelope.put("causationId", event.getCausationId());
        envelope.put("occurredAt", event.getOccurredAt());
        envelope.put("data", event.getData());
        return envelope;
    }
}
