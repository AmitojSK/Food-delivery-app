package com.fooddelivery.deliveryservice.security;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DeliverySecurityTest {

    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final DeliverySecurity deliverySecurity = new DeliverySecurity(deliveryRepository);

    @Test
    void adminCanReadAnyDelivery() {
        when(deliveryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThat(deliverySecurity.canReadDelivery(1L, admin())).isTrue();
    }

    @Test
    void anyDriverCanReadAPendingUnassignedDelivery() {
        when(deliveryRepository.findById(1L)).thenReturn(Optional.of(pendingDelivery()));

        assertThat(deliverySecurity.canReadDelivery(1L, driver(9L))).isTrue();
    }

    @Test
    void onlyTheAssignedDriverCanReadAnAssignedDelivery() {
        Delivery delivery = pendingDelivery();
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setDriverId(9L);
        when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));

        assertThat(deliverySecurity.canReadDelivery(1L, driver(9L))).isTrue();
        assertThat(deliverySecurity.canReadDelivery(1L, driver(42L))).isFalse();
    }

    @Test
    void unknownDeliveryIsNotReadable() {
        when(deliveryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThat(deliverySecurity.canReadDelivery(1L, driver(9L))).isFalse();
    }

    @Test
    void onlyTheAssignedDriverCanReadAnAssignedDeliveryByOrderId() {
        Delivery delivery = pendingDelivery();
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setDriverId(9L);
        when(deliveryRepository.findByOrderId("order-1")).thenReturn(Optional.of(delivery));

        assertThat(deliverySecurity.canReadOrderDelivery("order-1", driver(9L))).isTrue();
        assertThat(deliverySecurity.canReadOrderDelivery("order-1", driver(42L))).isFalse();
    }

    @Test
    void theOrderingCustomerCanTrackTheirOwnDelivery() {
        Delivery delivery = pendingDelivery();
        delivery.setCustomerId(7L);
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        delivery.setDriverId(9L);
        when(deliveryRepository.findByOrderId("order-1")).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));

        assertThat(deliverySecurity.canReadOrderDelivery("order-1", customer(7L))).isTrue();
        assertThat(deliverySecurity.canReadDelivery(1L, customer(7L))).isTrue();
    }

    @Test
    void aDifferentCustomerCannotReadSomeoneElsesDelivery() {
        Delivery delivery = pendingDelivery();
        delivery.setCustomerId(7L);
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        when(deliveryRepository.findByOrderId("order-1")).thenReturn(Optional.of(delivery));

        assertThat(deliverySecurity.canReadOrderDelivery("order-1", customer(8L))).isFalse();
    }

    @Test
    void pendingDeliveriesAreNotExposedToOrdinaryCustomers() {
        // Regression: the PENDING branch previously matched ANY authenticated principal,
        // leaking pickup and delivery addresses of every unassigned delivery.
        Delivery delivery = pendingDelivery();
        delivery.setCustomerId(7L);
        when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));

        assertThat(deliverySecurity.canReadDelivery(1L, customer(8L))).isFalse();
    }

    @Test
    void aDeliveryWithNoRecordedCustomerIsReadableByNoCustomer() {
        Delivery delivery = pendingDelivery();
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setDriverId(9L);
        when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));

        assertThat(deliverySecurity.canReadDelivery(1L, customer(7L))).isFalse();
    }

    private Delivery pendingDelivery() {
        Delivery delivery = new Delivery();
        ReflectionTestUtils.setField(delivery, "id", 1L);
        delivery.setOrderId("order-1");
        delivery.setStatus(DeliveryStatus.PENDING);
        return delivery;
    }

    private UsernamePasswordAuthenticationToken customer(Long userId) {
        return new UsernamePasswordAuthenticationToken(userId, null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
    }

    private UsernamePasswordAuthenticationToken admin() {
        return new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private UsernamePasswordAuthenticationToken driver(Long driverId) {
        return new UsernamePasswordAuthenticationToken(driverId, null,
                List.of(new SimpleGrantedAuthority("ROLE_DELIVERY_PARTNER")));
    }
}
