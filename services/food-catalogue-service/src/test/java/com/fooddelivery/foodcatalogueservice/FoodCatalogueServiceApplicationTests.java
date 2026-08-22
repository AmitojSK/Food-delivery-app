package com.fooddelivery.foodcatalogueservice;

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
class FoodCatalogueServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextLoads() {
    }

    @Test
    void foodItemBrowsingIsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/food-items")).andExpect(status().isOk());
    }

    @Test
    void foodItemMutationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/food-items").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotCreateFoodItem() throws Exception {
        mockMvc.perform(post("/api/v1/food-items").contentType(MediaType.APPLICATION_JSON).content("""
                {"restaurantId":1,"name":"Paneer Butter Masala","description":"Creamy curry",
                "category":"Main Course","price":240.00}
                """))
                .andExpect(status().isForbidden());
    }
}
