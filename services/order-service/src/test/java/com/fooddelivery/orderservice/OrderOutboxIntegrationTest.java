package com.fooddelivery.orderservice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fooddelivery.orderservice.client.FoodItemResponse;
import com.fooddelivery.orderservice.client.RestaurantResponse;
import com.fooddelivery.orderservice.client.ServiceClient;
import com.fooddelivery.orderservice.dto.CreateOrderItemRequest;
import com.fooddelivery.orderservice.dto.CreateOrderRequest;
import com.fooddelivery.orderservice.dto.OrderResponse;
import com.fooddelivery.orderservice.dto.UpdateOrderStatusRequest;
import com.fooddelivery.orderservice.entity.OrderStatus;
import com.fooddelivery.orderservice.event.OrderOutboxEvent;
import com.fooddelivery.orderservice.event.OrderOutboxPublisher;
import com.fooddelivery.orderservice.event.OrderOutboxRepository;
import com.fooddelivery.orderservice.service.OrderService;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Proves the transactional-outbox claim against real infrastructure rather than mocks:
 * a single-node Mongo replica set (required for the MongoTransactionManager wired in
 * MongoConfig — without a replica set, the write below fails with "Transaction numbers
 * are only allowed on a replica set member or mongos") and a real Kafka broker that the
 * scheduled OrderOutboxPublisher must actually reach.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        // The shared test application.yml excludes Mongo autoconfiguration for the rest of
        // the suite (those tests mock every repository). This test needs the real thing.
        properties = "spring.autoconfigure.exclude=")
@Testcontainers(disabledWithoutDocker = true)
class OrderOutboxIntegrationTest {

    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7");
    static final KafkaContainer KAFKA = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    static {
        MONGO.start();
        KAFKA.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        registry.add("app.kafka.provision-topics", () -> "true");
        // Disable the background @Scheduled publisher so publishPendingEvents() below is
        // the only thing moving outbox rows to "published" — otherwise the scheduler could
        // race ahead of the assertions and make this test flaky.
        registry.add("app.kafka.outbox-poll-interval-ms", () -> "999999999");
    }

    @AfterAll
    static void stopContainers() {
        KAFKA.stop();
        MONGO.stop();
    }

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderOutboxRepository outboxRepository;

    @Autowired
    private OrderOutboxPublisher outboxPublisher;

    @MockBean
    private ServiceClient serviceClient;

    @Test
    void readyForPickupTransitionPersistsOutboxTransactionallyAndPublishesToKafka() {
        when(serviceClient.getRestaurant(1L)).thenReturn(new RestaurantResponse(
                1L, "Spice Garden", "Indian", "12 MG Road", "Bengaluru", "Karnataka", "560001",
                "hello@spice.example", "+91 9876500000", true, 2L, null, null));
        when(serviceClient.getFoodItem(1L)).thenReturn(new FoodItemResponse(
                1L, 1L, "Paneer", "Creamy curry", "Main Course", new BigDecimal("240.00"),
                true, null, null));

        OrderResponse created = orderService.createOrder(new CreateOrderRequest(
                1L, 1L, "12 MG Road, Bengaluru", "Amit", "+91 9876500000",
                List.of(new CreateOrderItemRequest(1L, "Paneer", 1, new BigDecimal("240.00")))));

        orderService.updateOrderStatus(created.id(), new UpdateOrderStatusRequest(OrderStatus.CONFIRMED));
        orderService.updateOrderStatus(created.id(), new UpdateOrderStatusRequest(OrderStatus.PREPARING));
        orderService.updateOrderStatus(created.id(), new UpdateOrderStatusRequest(OrderStatus.READY_FOR_PICKUP));

        List<OrderOutboxEvent> pending = outboxRepository.findTop100ByPublishedAtIsNullOrderByOccurredAtAsc();
        assertThat(pending).hasSize(1);
        assertThat(pending.get(0).getEventType()).isEqualTo("OrderReadyForPickup");
        assertThat(pending.get(0).getAggregateId()).isEqualTo(created.id());

        outboxPublisher.publishPendingEvents();

        OrderOutboxEvent published = outboxRepository.findById(pending.get(0).getId()).orElseThrow();
        assertThat(published.getPublishedAt()).isNotNull();

        ConsumerRecord<String, String> record = consumeOneRecordFrom("order.events.v1");
        JsonNode envelope = parse(record.value());
        assertThat(envelope.get("eventType").asText()).isEqualTo("OrderReadyForPickup");
        assertThat(envelope.get("data").get("orderId").asText()).isEqualTo(created.id());
        assertThat(envelope.get("data").get("restaurantId").asInt()).isEqualTo(1);
    }

    private ConsumerRecord<String, String> consumeOneRecordFrom(String topic) {
        Map<String, Object> consumerProps = KafkaTestUtils.consumerProps(
                KAFKA.getBootstrapServers(), "order-outbox-it", "true");
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        try (Consumer<String, String> consumer = new org.apache.kafka.clients.consumer.KafkaConsumer<>(consumerProps)) {
            consumer.subscribe(List.of(topic));
            ConsumerRecords<String, String> records = KafkaTestUtils.getRecords(consumer, Duration.ofSeconds(15));
            assertThat(records.count()).isGreaterThan(0);
            return records.iterator().next();
        }
    }

    private JsonNode parse(String json) {
        try {
            return new ObjectMapper().readTree(json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
