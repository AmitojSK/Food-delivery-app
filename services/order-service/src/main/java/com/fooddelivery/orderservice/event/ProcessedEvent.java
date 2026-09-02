package com.fooddelivery.orderservice.event;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "order_inbox")
public class ProcessedEvent {
    @Id private String eventId;
    private Instant processedAt;
    public ProcessedEvent() { }
    public ProcessedEvent(String eventId) { this.eventId = eventId; this.processedAt = Instant.now(); }
    public String getEventId() { return eventId; }
    public Instant getProcessedAt() { return processedAt; }
}
