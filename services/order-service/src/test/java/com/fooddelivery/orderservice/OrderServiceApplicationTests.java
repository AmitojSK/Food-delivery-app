package com.fooddelivery.orderservice;

import com.fooddelivery.orderservice.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
class OrderServiceApplicationTests {

    @MockBean
    private OrderRepository orderRepository;

    @Test
    void contextLoads() {
    }
}
