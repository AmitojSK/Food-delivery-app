package com.fooddelivery.userservice.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.security.OAuth2ProviderAdapter.SocialProfile;
import com.fooddelivery.userservice.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * On a successful OAuth2 login, upserts the user, mints our own JWT, and bounces the browser
 * back to the SPA at {@code app.oauth2.success-redirect}. The auth payload (same shape as
 * {@code /login}) is base64url-encoded in the URL <em>fragment</em> ({@code #data=...}) so it
 * never reaches server logs, proxies, or the Referer header. Failures route to the SPA's
 * failure URL with an {@code ?error=} message.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthenticationService authenticationService;
    private final OAuth2ProviderAdapter providerAdapter;
    private final HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository;
    private final OAuth2Properties properties;
    private final ObjectMapper objectMapper;
    private final RedirectStrategy redirectStrategy = new DefaultRedirectStrategy();

    public OAuth2LoginSuccessHandler(AuthenticationService authenticationService,
                                     OAuth2ProviderAdapter providerAdapter,
                                     HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository,
                                     OAuth2Properties properties, ObjectMapper objectMapper) {
        this.authenticationService = authenticationService;
        this.providerAdapter = providerAdapter;
        this.authorizationRequestRepository = authorizationRequestRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        authorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
        try {
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            OAuth2User principal = (OAuth2User) authentication.getPrincipal();
            SocialProfile profile = providerAdapter.extract(principal, token.getAuthorizedClientRegistrationId());

            AuthenticationResponse authResponse = authenticationService.completeOAuth2Login(profile);
            String data = Base64.getUrlEncoder().encodeToString(
                    objectMapper.writeValueAsBytes(authResponse));
            redirectStrategy.sendRedirect(request, response, properties.getSuccessRedirect() + "#data=" + data);
        } catch (Exception e) {
            String error = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(safeMessage(e).getBytes(StandardCharsets.UTF_8));
            redirectStrategy.sendRedirect(request, response, properties.getFailureRedirect() + "?error=" + error);
        }
    }

    private String safeMessage(Exception e) {
        String message = e.getMessage();
        return (message == null || message.isBlank()) ? "Sign-in failed" : message;
    }
}
