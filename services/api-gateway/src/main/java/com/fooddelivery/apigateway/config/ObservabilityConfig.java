package com.fooddelivery.apigateway.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Installs the OpenTelemetry Logback appender with the SDK at startup.
 *
 * <p>Spring Boot 3.4 configures the OTLP log exporter ({@code SdkLoggerProvider}) but does
 * <b>not</b> install the {@link OpenTelemetry} instance into the Logback appender, so the
 * {@code OTEL} appender in logback-spring.xml stays a no-op (no logs exported) until we do it here.
 * This one call is what actually turns on OTLP log shipping to Grafana Cloud; without it, traces
 * work but logs are silently dropped.
 */
@Configuration(proxyBeanMethods = false)
public class ObservabilityConfig {

    @Bean
    InitializingBean openTelemetryLogbackAppenderInstaller(OpenTelemetry openTelemetry) {
        return () -> OpenTelemetryAppender.install(openTelemetry);
    }
}
