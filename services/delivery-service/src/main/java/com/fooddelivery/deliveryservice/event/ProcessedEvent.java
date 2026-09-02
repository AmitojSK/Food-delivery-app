package com.fooddelivery.deliveryservice.event;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "delivery_inbox")
public class ProcessedEvent {
    @Id private String eventId;
    private Instant processedAt = Instant.now();
    protected ProcessedEvent() { }
    public ProcessedEvent(String eventId) { this.eventId = eventId; }
}
