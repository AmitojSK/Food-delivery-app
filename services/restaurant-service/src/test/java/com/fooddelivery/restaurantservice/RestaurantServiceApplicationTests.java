package com.fooddelivery.restaurantservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RestaurantServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextLoads() {
    }

    @Test
    void restaurantBrowsingIsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/restaurants")).andExpect(status().isOk());
    }

    @Test
    void restaurantMutationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/restaurants").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotCreateRestaurant() throws Exception {
        mockMvc.perform(post("/api/v1/restaurants").contentType(MediaType.APPLICATION_JSON).content("""
                {"name":"Spice Garden","cuisineType":"Indian","streetAddress":"12 MG Road",
                "city":"Bengaluru","state":"Karnataka","postalCode":"560001",
                "contactEmail":"hello@spice.example","contactPhone":"+91 9876500000"}
                """))
                .andExpect(status().isForbidden());
    }
}
