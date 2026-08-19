package com.fooddelivery.userservice.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {
    private final RestAuthenticationEntryPoint errorWriter;
    public RestAccessDeniedHandler(RestAuthenticationEntryPoint errorWriter) { this.errorWriter = errorWriter; }
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException exception) throws IOException {
        errorWriter.writeError(request, response, HttpStatus.FORBIDDEN, "You do not have permission to access this resource");
    }
}
