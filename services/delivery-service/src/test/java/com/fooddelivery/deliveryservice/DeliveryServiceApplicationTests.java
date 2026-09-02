package com.fooddelivery.deliveryservice;

import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import com.fooddelivery.deliveryservice.event.DeliveryEventPublisher;
import com.fooddelivery.deliveryservice.event.ProcessedEventRepository;
import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DeliveryServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeliveryRepository deliveryRepository;

    @MockBean
    private ProcessedEventRepository processedEventRepository;

    @MockBean
    private DeliveryEventPublisher eventPublisher;

    @Test
    void contextLoads() {
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/deliveries/available"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void onlyAdminCanCreateDeliveriesDirectly() throws Exception {
        mockMvc.perform(post("/api/v1/deliveries")
                        .with(authentication(driverAuthentication(1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDeliveryRequest()))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateDelivery() throws Exception {
        when(deliveryRepository.findByOrderId("order-1")).thenReturn(Optional.empty());
        when(deliveryRepository.save(any())).thenAnswer(invocation -> {
            Delivery delivery = invocation.getArgument(0);
            ReflectionTestUtils.setField(delivery, "id", 1L);
            return delivery;
        });

        mockMvc.perform(post("/api/v1/deliveries")
                        .with(authentication(adminAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDeliveryRequest()))
                .andExpect(status().isCreated());
    }

    @Test
    void restaurantOwnerCannotListAvailableDeliveries() throws Exception {
        mockMvc.perform(get("/api/v1/deliveries/available")
                        .with(authentication(restaurantOwnerAuthentication())))
                .andExpect(status().isForbidden());
    }

    @Test
    void driverCanAcceptAPendingDelivery() throws Exception {
        Delivery delivery = pendingDelivery(5L);
        delivery.setDriverId(9L);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        when(deliveryRepository.assignPendingDelivery(eq(5L), eq(9L))).thenReturn(1);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        mockMvc.perform(post("/api/v1/deliveries/5/accept")
                        .with(authentication(driverAuthentication(9L))))
                .andExpect(status().isOk());
    }

    @Test
    void secondDriverCannotAcceptAnAlreadyAssignedDelivery() throws Exception {
        when(deliveryRepository.assignPendingDelivery(eq(5L), anyLong())).thenReturn(0);

        mockMvc.perform(post("/api/v1/deliveries/5/accept")
                        .with(authentication(driverAuthentication(9L))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void driverCannotUpdateStatusForADeliveryAssignedToSomeoneElse() throws Exception {
        Delivery delivery = pendingDelivery(5L);
        delivery.setDriverId(9L);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        when(deliveryRepository.findById(5L)).thenReturn(Optional.of(delivery));

        mockMvc.perform(patch("/api/v1/deliveries/5/status")
                        .with(authentication(driverAuthentication(42L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PICKED_UP\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    private String createDeliveryRequest() {
        return """
                {"orderId":"order-1","restaurantId":1,"pickupAddress":"12 MG Road","deliveryAddress":"45 Church St"}
                """;
    }

    private Delivery pendingDelivery(Long id) {
        Delivery delivery = new Delivery();
        ReflectionTestUtils.setField(delivery, "id", id);
        delivery.setOrderId("order-1");
        delivery.setRestaurantId(1L);
        delivery.setPickupAddress("12 MG Road");
        delivery.setDeliveryAddress("45 Church St");
        delivery.setStatus(DeliveryStatus.PENDING);
        return delivery;
    }

    private UsernamePasswordAuthenticationToken driverAuthentication(Long driverId) {
        return new UsernamePasswordAuthenticationToken(driverId, null,
                List.of(new SimpleGrantedAuthority("ROLE_DELIVERY_PARTNER")));
    }

    private UsernamePasswordAuthenticationToken restaurantOwnerAuthentication() {
        return new UsernamePasswordAuthenticationToken(1L, null,
                List.of(new SimpleGrantedAuthority("ROLE_RESTAURANT_OWNER")));
    }

    private UsernamePasswordAuthenticationToken adminAuthentication() {
        return new UsernamePasswordAuthenticationToken(1L, null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }
}
