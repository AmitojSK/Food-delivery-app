package com.fooddelivery.userservice.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

/**
 * Routes a failed OAuth2 login (provider error, denied consent, bad state) back to the SPA's
 * failure URL with a base64url {@code ?error=} message, and clears the auth-request cookie.
 */
@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private final HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository;
    private final OAuth2Properties properties;
    private final RedirectStrategy redirectStrategy = new DefaultRedirectStrategy();

    public OAuth2LoginFailureHandler(HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository,
                                     OAuth2Properties properties) {
        this.authorizationRequestRepository = authorizationRequestRepository;
        this.properties = properties;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        authorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
        String message = (exception.getMessage() == null || exception.getMessage().isBlank())
                ? "Sign-in failed" : exception.getMessage();
        String error = Base64.getUrlEncoder().withoutPadding().encodeToString(message.getBytes(StandardCharsets.UTF_8));
        redirectStrategy.sendRedirect(request, response, properties.getFailureRedirect() + "?error=" + error);
    }
}
