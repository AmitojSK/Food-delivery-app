package com.fooddelivery.deliveryservice.service;

import com.fooddelivery.deliveryservice.cache.DriverLocationCache;
import com.fooddelivery.deliveryservice.dto.CreateDeliveryRequest;
import com.fooddelivery.deliveryservice.dto.UpdateDeliveryStatusRequest;
import com.fooddelivery.deliveryservice.dto.UpdateLocationRequest;
import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import com.fooddelivery.deliveryservice.event.DeliveryEventPublisher;
import com.fooddelivery.deliveryservice.exception.DeliveryValidationException;
import com.fooddelivery.deliveryservice.mapper.DeliveryMapper;
import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryServiceTest {

    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final DeliveryEventPublisher eventPublisher = mock(DeliveryEventPublisher.class);
    private final DriverLocationCache driverLocationCache = mock(DriverLocationCache.class);
    private final DeliveryService deliveryService =
            new DeliveryService(deliveryRepository, new DeliveryMapper(), eventPublisher, driverLocationCache);

    private Delivery delivery;

    @BeforeEach
    void setUp() {
        delivery = new Delivery();
        ReflectionTestUtils.setField(delivery, "id", 5L);
        delivery.setOrderId("order-1");
        delivery.setRestaurantId(1L);
        delivery.setPickupAddress("12 MG Road");
        delivery.setDeliveryAddress("45 Church St");
        delivery.setStatus(DeliveryStatus.PENDING);
    }

    @Test
    void createDeliveryRejectsADuplicateForTheSameOrder() {
        when(deliveryRepository.findByOrderId("order-1")).thenReturn(Optional.of(delivery));

        assertThatThrownBy(() -> deliveryService.createDelivery(
                new CreateDeliveryRequest("order-1", 1L, "12 MG Road", "45 Church St")))
                .isInstanceOf(DeliveryValidationException.class);

        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void createDeliveryPersistsANewPendingDelivery() {
        when(deliveryRepository.findByOrderId("order-1")).thenReturn(Optional.empty());
        when(deliveryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.createDelivery(
                new CreateDeliveryRequest("order-1", 1L, "12 MG Road", "45 Church St"));

        assertThat(response.status()).isEqualTo("PENDING");
        verify(eventPublisher, never()).publish(any(), any());
    }

    @Test
    void acceptDeliveryPublishesAssignedEventOnSuccess() {
        delivery.setDriverId(9L);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        when(deliveryRepository.assignPendingDelivery(5L, 9L)).thenReturn(1);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        deliveryService.acceptDelivery(5L, 9L);

        ArgumentCaptor<String> eventType = ArgumentCaptor.forClass(String.class);
        verify(eventPublisher).publish(eq(delivery), eventType.capture());
        assertThat(eventType.getValue()).isEqualTo("DeliveryAssigned");
    }

    @Test
    void acceptDeliveryFailsWhenAnotherDriverWonTheRace() {
        when(deliveryRepository.assignPendingDelivery(eq(5L), anyLong())).thenReturn(0);

        assertThatThrownBy(() -> deliveryService.acceptDelivery(5L, 9L))
                .isInstanceOf(DeliveryValidationException.class);

        verify(eventPublisher, never()).publish(any(), any());
    }

    @Test
    void updateStatusRejectsADriverNotAssignedToTheDelivery() {
        delivery.setDriverId(9L);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        assertThatThrownBy(() -> deliveryService.updateStatus(5L, 42L,
                new UpdateDeliveryStatusRequest(DeliveryStatus.PICKED_UP)))
                .isInstanceOf(DeliveryValidationException.class);
    }

    @Test
    void updateStatusRejectsASkippedTransition() {
        delivery.setDriverId(9L);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        assertThatThrownBy(() -> deliveryService.updateStatus(5L, 9L,
                new UpdateDeliveryStatusRequest(DeliveryStatus.DELIVERED)))
                .isInstanceOf(DeliveryValidationException.class);
    }

    @Test
    void updateStatusAppliesAValidTransitionAndPublishesTheMatchingEvent() {
        delivery.setDriverId(9L);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.updateStatus(5L, 9L,
                new UpdateDeliveryStatusRequest(DeliveryStatus.PICKED_UP));

        assertThat(response.status()).isEqualTo("PICKED_UP");
        assertThat(response.pickedUpAt()).isNotNull();
        verify(eventPublisher).publish(delivery, "DeliveryPickedUp");
    }

    @Test
    void updateLocationRejectsADriverNotAssignedToTheDelivery() {
        delivery.setDriverId(9L);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        assertThatThrownBy(() -> deliveryService.updateLocation(5L, 42L, new UpdateLocationRequest(12.9, 77.6)))
                .isInstanceOf(DeliveryValidationException.class);
    }

    @Test
    void updateLocationStoresTheDriversLatestCoordinates() {
        delivery.setDriverId(9L);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.updateLocation(5L, 9L, new UpdateLocationRequest(12.9, 77.6));

        assertThat(response.driverLatitude()).isEqualTo(12.9);
        assertThat(response.driverLongitude()).isEqualTo(77.6);
        verify(driverLocationCache).remember(9L, 12.9, 77.6);
    }

    @Test
    void liveDriverLocationIsNotFoundWhenNoDeliveryOrDriverAssignedYet() {
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        assertThatThrownBy(() -> deliveryService.getLiveDriverLocation(5L))
                .isInstanceOf(com.fooddelivery.deliveryservice.exception.ResourceNotFoundException.class);
    }

    @Test
    void liveDriverLocationIsNotFoundWhenTheCacheHasNoRecentReading() {
        delivery.setDriverId(9L);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));
        when(driverLocationCache.find(9L)).thenReturn(null);

        assertThatThrownBy(() -> deliveryService.getLiveDriverLocation(5L))
                .isInstanceOf(com.fooddelivery.deliveryservice.exception.ResourceNotFoundException.class);
    }

    @Test
    void liveDriverLocationReturnsTheCachedReadingWhenPresent() {
        delivery.setDriverId(9L);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));
        var cached = new DriverLocationCache.DriverLocationView(9L, 12.9, 77.6, java.time.Instant.now());
        when(driverLocationCache.find(9L)).thenReturn(cached);

        var response = deliveryService.getLiveDriverLocation(5L);

        assertThat(response.latitude()).isEqualTo(12.9);
        assertThat(response.longitude()).isEqualTo(77.6);
    }
}
