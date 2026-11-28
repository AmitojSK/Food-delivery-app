package com.fooddelivery.orderservice.exception;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientRequestException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException exception, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(OrderValidationException.class)
    ResponseEntity<ApiErrorResponse> handleOrderValidation(OrderValidationException exception, HttpServletRequest request) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, "You do not have permission to access this resource", request, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.put(error.getField(), error.getDefaultMessage()));
        return buildResponse(HttpStatus.BAD_REQUEST, "Request validation failed", request, fieldErrors);
    }

    // Circuit breaker is OPEN — a downstream validation service (restaurant/catalogue) is failing, so
    // we fail fast instead of blocking an order thread. 503 = "try again shortly", not a 500 bug.
    @ExceptionHandler(CallNotPermittedException.class)
    ResponseEntity<ApiErrorResponse> handleCircuitOpen(CallNotPermittedException exception, HttpServletRequest request) {
        log.warn("Circuit open, failing fast for {}: {}", request.getRequestURI(), exception.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
                "A required service is temporarily unavailable; please try again shortly", request, Map.of());
    }

    // Transport failure reaching a downstream service (connection refused / timeout). Maps to 503
    // rather than a generic 500 — the request is fine, the dependency is unreachable.
    @ExceptionHandler(WebClientRequestException.class)
    ResponseEntity<ApiErrorResponse> handleDownstreamUnreachable(WebClientRequestException exception, HttpServletRequest request) {
        log.warn("Downstream unreachable for {}: {}", request.getRequestURI(), exception.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
                "A required service is temporarily unavailable; please try again shortly", request, Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unexpected error while handling {}", request.getRequestURI(), exception);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", request, Map.of());
    }

    private ResponseEntity<ApiErrorResponse> buildResponse(
            HttpStatus status,
            String message,
            HttpServletRequest request,
            Map<String, String> fieldErrors
    ) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI(),
                fieldErrors
        ));
    }
}
