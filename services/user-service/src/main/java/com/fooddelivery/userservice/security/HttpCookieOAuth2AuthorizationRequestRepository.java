package com.fooddelivery.userservice.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.time.Duration;
import java.util.Base64;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Stores the in-flight {@link OAuth2AuthorizationRequest} in a short-lived cookie instead of the
 * HTTP session, so the authorization-code round trip works under a STATELESS security policy and
 * behind the gateway (no sticky sessions required). The cookie is httpOnly + SameSite=Lax (the
 * provider redirects back via a top-level GET, which Lax permits) and Secure over HTTPS.
 *
 * <p>The payload is Java-serialized; because a cookie is attacker-controllable, deserialization
 * runs through an {@link ObjectInputFilter} allowlist limited to the classes this type can hold.
 */
@Component
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    static final String COOKIE_NAME = "oauth2_auth_request";
    private static final Duration COOKIE_TTL = Duration.ofMinutes(3);
    private static final ObjectInputFilter DESERIALIZATION_FILTER = ObjectInputFilter.Config.createFilter(
            "org.springframework.security.oauth2.**;org.springframework.security.core.**;"
                    + "java.util.**;java.lang.**;java.time.**;!*");

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return readCookie(request)
                .map(Cookie::getValue)
                .map(this::deserialize)
                .orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                         HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            deleteCookie(request, response);
            return;
        }
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, serialize(authorizationRequest))
                .path("/")
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .maxAge(COOKIE_TTL)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
                                                                 HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        if (authorizationRequest != null) {
            deleteCookie(request, response);
        }
        return authorizationRequest;
    }

    /** Clears the cookie after the login completes (success or failure). */
    public void removeAuthorizationRequestCookies(HttpServletRequest request, HttpServletResponse response) {
        deleteCookie(request, response);
    }

    private java.util.Optional<Cookie> readCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return java.util.Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return java.util.Optional.of(cookie);
            }
        }
        return java.util.Optional.empty();
    }

    private void deleteCookie(HttpServletRequest request, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .path("/")
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private String serialize(OAuth2AuthorizationRequest authorizationRequest) {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(authorizationRequest);
            out.flush();
            return Base64.getUrlEncoder().encodeToString(bytes.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize OAuth2 authorization request", e);
        }
    }

    private OAuth2AuthorizationRequest deserialize(String value) {
        try (ObjectInputStream in = new ObjectInputStream(
                new ByteArrayInputStream(Base64.getUrlDecoder().decode(value)))) {
            in.setObjectInputFilter(DESERIALIZATION_FILTER);
            return (OAuth2AuthorizationRequest) in.readObject();
        } catch (Exception e) {
            // Tampered/stale cookie: treat as no saved request.
            return null;
        }
    }
}
