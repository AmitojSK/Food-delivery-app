package com.fooddelivery.orderservice.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableMongoAuditing
@EnableTransactionManagement
@ConditionalOnProperty(name = "spring.data.mongodb.uri")
public class MongoConfig {

    // @ConditionalOnBean(MongoDatabaseFactory.class) here would be evaluated while this
    // (regular, component-scanned) configuration class is processed, which is not guaranteed
    // to happen after MongoAutoConfiguration registers that bean — Spring's own docs call this
    // ordering unreliable. Resolving it lazily via ObjectProvider at bean-creation time (well
    // after all bean definitions, including auto-configured ones, are registered) avoids the
    // race: it silently yields no bean in tests that exclude Mongo autoconfiguration entirely.
    @Bean
    MongoTransactionManager transactionManager(ObjectProvider<MongoDatabaseFactory> databaseFactory) {
        MongoDatabaseFactory factory = databaseFactory.getIfAvailable();
        return factory != null ? new MongoTransactionManager(factory) : null;
    }
}
