package com.fooddelivery.orderservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@EnableMongoAuditing
@ConditionalOnProperty(name = "spring.data.mongodb.uri")
public class MongoConfig {
}
