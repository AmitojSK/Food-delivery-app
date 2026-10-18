package com.fooddelivery.userservice.security;

import com.fooddelivery.userservice.entity.AuthProvider;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Normalises a provider's OAuth2 user attributes into a common {@link SocialProfile}.
 * This is the extensibility seam: supporting a new provider means adding one branch here
 * (plus a client registration in {@link OAuth2ClientConfig}) — nothing else changes.
 */
@Component
public class OAuth2ProviderAdapter {

    public record SocialProfile(AuthProvider provider, String providerId, String email,
                                String firstName, String lastName) {
    }

    public SocialProfile extract(OAuth2User user, String registrationId) {
        return switch (registrationId.toLowerCase()) {
            case "google" -> google(user);
            case "github" -> github(user);
            default -> throw new IllegalArgumentException("Unsupported OAuth2 provider: " + registrationId);
        };
    }

    private SocialProfile google(OAuth2User user) {
        String email = normalizeEmail(user.getAttribute("email"));
        return new SocialProfile(
                AuthProvider.GOOGLE,
                requireAttribute(user, "sub", "google"),
                email,
                firstNonBlank(user.getAttribute("given_name"), "Google"),
                firstNonBlank(user.getAttribute("family_name"), "User"));
    }

    private SocialProfile github(OAuth2User user) {
        Object id = user.getAttribute("id");
        if (id == null) {
            throw new IllegalArgumentException("GitHub account is missing an id");
        }
        String email = normalizeEmail(user.getAttribute("email"));
        String[] names = splitName(user.getAttribute("name"), user.getAttribute("login"));
        return new SocialProfile(AuthProvider.GITHUB, id.toString(), email, names[0], names[1]);
    }

    /** Splits a provider-supplied full name into first/last, falling back to a login handle. */
    private String[] splitName(String fullName, String login) {
        if (StringUtils.hasText(fullName)) {
            String[] parts = fullName.trim().split("\\s+", 2);
            return new String[]{parts[0], parts.length > 1 ? parts[1] : "User"};
        }
        return new String[]{firstNonBlank(login, "GitHub"), "User"};
    }

    private String requireAttribute(OAuth2User user, String key, String provider) {
        String value = user.getAttribute(key);
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Missing '" + key + "' from " + provider + " profile");
        }
        return value;
    }

    private String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim().toLowerCase() : null;
    }

    private String firstNonBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }
}
