package com.fooddelivery.orderservice.event;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OrderOutboxRepository extends MongoRepository<OrderOutboxEvent, String> {
    List<OrderOutboxEvent> findTop100ByPublishedAtIsNullOrderByOccurredAtAsc();
}
