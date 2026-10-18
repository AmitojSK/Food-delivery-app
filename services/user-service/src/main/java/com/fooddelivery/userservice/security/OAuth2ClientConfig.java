package com.fooddelivery.userservice.security;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.util.StringUtils;

/**
 * Builds the OAuth2 client registrations programmatically from {@link OAuth2Properties},
 * including only providers whose client id + secret are set. This deliberately avoids the
 * {@code spring.security.oauth2.client.registration.*} auto-config: that path would create a
 * registration (and fail validation) for an env var left blank, whereas here an unset provider
 * is simply omitted. When nothing is configured the bean is absent, so the service starts
 * normally and {@code SecurityConfig} leaves oauth2Login off.
 *
 * <p>A (possibly empty) bean is always published because {@code @EnableWebSecurity} plus the
 * oauth2-client jar require a ClientRegistrationRepository to build their AuthorizedClientManager;
 * {@code SecurityConfig} leaves oauth2Login off when no provider is configured.
 *
 * <p>Default redirect URI uses Spring's {@code {baseUrl}/login/oauth2/code/{registrationId}}
 * template (fine for local dev hitting the service directly). In the gateway deployment set the
 * explicit browser-facing URL (app origin + {@code /user-api/login/oauth2/code/<provider>}).
 */
@Configuration
@EnableConfigurationProperties(OAuth2Properties.class)
public class OAuth2ClientConfig {

    private static final String DEFAULT_REDIRECT_URI = "{baseUrl}/login/oauth2/code/{registrationId}";

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository(OAuth2Properties properties) {
        List<ClientRegistration> registrations = new ArrayList<>();
        if (properties.getGoogle().isConfigured()) {
            registrations.add(googleRegistration(properties.getGoogle()));
        }
        if (properties.getGithub().isConfigured()) {
            registrations.add(githubRegistration(properties.getGithub()));
        }
        // No providers configured: an empty repository that resolves nothing. It must be a real
        // bean (see class javadoc); oauth2Login stays disabled, so it is never consulted.
        return registrations.isEmpty()
                ? registrationId -> null
                : new InMemoryClientRegistrationRepository(registrations);
    }

    private ClientRegistration googleRegistration(OAuth2Properties.Provider p) {
        return CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(p.getClientId())
                .clientSecret(p.getClientSecret())
                .redirectUri(redirectUri(p))
                .clientName("Google")
                // openid/profile/email are the CommonOAuth2Provider.GOOGLE defaults.
                .build();
    }

    private ClientRegistration githubRegistration(OAuth2Properties.Provider p) {
        return CommonOAuth2Provider.GITHUB.getBuilder("github")
                .clientId(p.getClientId())
                .clientSecret(p.getClientSecret())
                .redirectUri(redirectUri(p))
                .clientName("GitHub")
                // user:email is needed to read the primary verified email (GitHub's /user can
                // return a null email when the user keeps it private).
                .scope("read:user", "user:email")
                .build();
    }

    private String redirectUri(OAuth2Properties.Provider p) {
        return StringUtils.hasText(p.getRedirectUri()) ? p.getRedirectUri() : DEFAULT_REDIRECT_URI;
    }
}
