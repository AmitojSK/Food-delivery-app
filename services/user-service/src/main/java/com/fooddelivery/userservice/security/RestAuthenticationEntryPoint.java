package com.fooddelivery.userservice.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fooddelivery.userservice.exception.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper objectMapper;
    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) { this.objectMapper = objectMapper; }
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException {
        writeError(request, response, HttpStatus.UNAUTHORIZED, "Authentication is required");
    }
    void writeError(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), new ApiErrorResponse(Instant.now(), status.value(),
                status.getReasonPhrase(), message, request.getRequestURI(), Map.of()));
    }
}
