package com.fooddelivery.orderservice;

import com.fooddelivery.orderservice.repository.OrderRepository;
import com.fooddelivery.orderservice.event.OrderOutboxRepository;
import com.fooddelivery.orderservice.event.ProcessedEventRepository;
import com.fooddelivery.orderservice.client.FoodItemResponse;
import com.fooddelivery.orderservice.client.RestaurantResponse;
import com.fooddelivery.orderservice.client.ServiceClient;
import com.fooddelivery.orderservice.security.JwtPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrderServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderRepository orderRepository;

    @MockBean
    private OrderOutboxRepository orderOutboxRepository;

    @MockBean
    private ProcessedEventRepository processedEventRepository;

    @MockBean
    private ServiceClient serviceClient;

    @Test
    void contextLoads() {
    }

    @Test
    void orderCreationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void customerCannotCreateOrderForAnotherUser() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                        .with(authentication(customerAuthentication(1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validOrderRequest(2L)))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCanCreateOrderForSelf() throws Exception {
        when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(serviceClient.getRestaurant(1L)).thenReturn(new RestaurantResponse(
                1L, "Spice Garden", "Indian", "12 MG Road", "Bengaluru", "Karnataka", "560001",
                "hello@spice.example", "+91 9876500000", true, 2L, null, null));
        when(serviceClient.getFoodItem(1L)).thenReturn(new FoodItemResponse(
                1L, 1L, "Paneer", "Creamy curry", "Main Course", new BigDecimal("240.00"),
                true, null, null));

        mockMvc.perform(post("/api/v1/orders")
                        .with(authentication(customerAuthentication(1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validOrderRequest(1L)))
                .andExpect(status().isCreated());
    }

    private UsernamePasswordAuthenticationToken customerAuthentication(Long userId) {
        return new UsernamePasswordAuthenticationToken(new JwtPrincipal(userId, "customer@example.com"), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
    }

    private String validOrderRequest(Long userId) {
        return """
                {"userId":%d,"restaurantId":1,"contactName":"Amit","contactPhone":"+91 9876500000",
                "deliveryAddress":"12 MG Road, Bengaluru","items":[{"foodItemId":1,"foodItemName":"Paneer","quantity":1,"unitPrice":240.00}]}
                """.formatted(userId);
    }
}
