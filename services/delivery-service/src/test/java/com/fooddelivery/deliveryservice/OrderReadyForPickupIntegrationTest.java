package com.fooddelivery.deliveryservice;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import com.fooddelivery.deliveryservice.event.ProcessedEventRepository;
import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the delivery-service side of the atomic inbox claim against real infrastructure:
 * a real MySQL database (Flyway-migrated, JPA transactions enabled) and a real Kafka broker
 * that OrderReadyForPickupConsumer actually listens on. Publishing the same
 * OrderReadyForPickup event twice must create exactly one PENDING delivery — that's the
 * whole point of the inbox table, and it was previously only verified against mocks.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=")
@Testcontainers(disabledWithoutDocker = true)
class OrderReadyForPickupIntegrationTest {

    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4");
    static final KafkaContainer KAFKA = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    static {
        MYSQL.start();
        KAFKA.start();
    }

    @org.springframework.test.context.DynamicPropertySource
    static void properties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        registry.add("app.kafka.provision-topics", () -> "true");
        registry.add("spring.kafka.listener.auto-startup", () -> "true");
    }

    @AfterAll
    static void stopContainers() {
        KAFKA.stop();
        MYSQL.stop();
    }

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Value("${app.kafka.topics.order-events}")
    private String orderEventsTopic;

    @Test
    void redeliveredOrderReadyForPickupEventCreatesExactlyOneDelivery() {
        String orderId = "order-" + UUID.randomUUID();
        String eventId = UUID.randomUUID().toString();
        Map<String, Object> envelope = orderReadyForPickupEnvelope(eventId, orderId);

        kafkaTemplate.send(orderEventsTopic, orderId, envelope);
        Delivery created = awaitDeliveryFor(orderId);
        assertThat(created.getStatus()).isEqualTo(DeliveryStatus.PENDING);
        assertThat(processedEventRepository.existsById(eventId)).isTrue();

        // Redeliver the identical event (broker retry, consumer restart before offset commit, etc.)
        kafkaTemplate.send(orderEventsTopic, orderId, envelope);
        awaitStableDeliveryCount(orderId, 1);

        List<Delivery> deliveriesForOrder = deliveryRepository.findAll().stream()
                .filter(d -> d.getOrderId().equals(orderId))
                .toList();
        assertThat(deliveriesForOrder).hasSize(1);
    }

    private Map<String, Object> orderReadyForPickupEnvelope(String eventId, String orderId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderId", orderId);
        data.put("restaurantId", 1);
        data.put("pickupAddress", "12 MG Road, Bengaluru");
        data.put("deliveryAddress", "45 Church St, Bengaluru");

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", "OrderReadyForPickup");
        envelope.put("eventVersion", 1);
        envelope.put("aggregateId", orderId);
        envelope.put("correlationId", orderId);
        envelope.put("causationId", eventId);
        envelope.put("occurredAt", Instant.now().toString());
        envelope.put("data", data);
        return envelope;
    }

    private Delivery awaitDeliveryFor(String orderId) {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(20));
        while (Instant.now().isBefore(deadline)) {
            var found = deliveryRepository.findByOrderId(orderId);
            if (found.isPresent()) return found.get();
            sleep();
        }
        throw new AssertionError("No delivery was created for order " + orderId + " within the timeout");
    }

    private void awaitStableDeliveryCount(String orderId, int expectedCount) {
        // Give a would-be duplicate a real chance to land before asserting it didn't.
        Instant deadline = Instant.now().plus(Duration.ofSeconds(5));
        while (Instant.now().isBefore(deadline)) {
            sleep();
        }
        long count = deliveryRepository.findAll().stream().filter(d -> d.getOrderId().equals(orderId)).count();
        assertThat(count).isEqualTo(expectedCount);
    }

    private void sleep() {
        try {
            Thread.sleep(200);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
