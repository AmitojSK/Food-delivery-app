package com.fooddelivery.foodcatalogueservice.event;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Inbox row: the id of an event this service has already processed. Kafka is at-least-once, so the
 * consumer records each handled eventId and skips any it has seen — turning redelivery into a no-op
 * (effectively-once processing).
 */
@Entity
@Table(name = "catalogue_inbox")
public class ProcessedEvent {
    @Id
    private String eventId;
    private Instant processedAt = Instant.now();

    protected ProcessedEvent() { }

    public ProcessedEvent(String eventId) {
        this.eventId = eventId;
    }
}
