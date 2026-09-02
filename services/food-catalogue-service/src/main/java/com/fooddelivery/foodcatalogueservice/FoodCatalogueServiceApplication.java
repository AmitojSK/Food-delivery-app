package com.fooddelivery.foodcatalogueservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class FoodCatalogueServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FoodCatalogueServiceApplication.class, args);
    }
}
