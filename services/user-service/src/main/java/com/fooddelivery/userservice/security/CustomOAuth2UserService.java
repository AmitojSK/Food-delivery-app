package com.fooddelivery.userservice.security;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/**
 * Loads the OAuth2 user profile, then fills in GitHub's email when it's absent: GitHub's
 * {@code /user} endpoint returns a null email for users who keep it private, so we call
 * {@code /user/emails} and take the primary verified address. Everything else is the default.
 */
@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private final RestClient restClient = RestClient.create();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User user = delegate.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        if ("github".equalsIgnoreCase(registrationId) && !StringUtils.hasText(user.getAttribute("email"))) {
            String email = fetchGithubPrimaryEmail(userRequest.getAccessToken().getTokenValue());
            if (StringUtils.hasText(email)) {
                Map<String, Object> attributes = new HashMap<>(user.getAttributes());
                attributes.put("email", email);
                String nameAttributeKey = userRequest.getClientRegistration()
                        .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();
                return new DefaultOAuth2User(user.getAuthorities(), attributes, nameAttributeKey);
            }
        }
        return user;
    }

    @SuppressWarnings("unchecked")
    private String fetchGithubPrimaryEmail(String accessToken) {
        try {
            List<Map<String, Object>> emails = restClient.get()
                    .uri("https://api.github.com/user/emails")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(List.class);
            if (emails == null) {
                return null;
            }
            String firstVerified = null;
            for (Map<String, Object> entry : emails) {
                boolean verified = Boolean.TRUE.equals(entry.get("verified"));
                boolean primary = Boolean.TRUE.equals(entry.get("primary"));
                String email = (String) entry.get("email");
                if (verified && primary) {
                    return email;
                }
                if (verified && firstVerified == null) {
                    firstVerified = email;
                }
            }
            return firstVerified;
        } catch (Exception e) {
            // Email stays null; the sign-in still works keyed on the provider id.
            return null;
        }
    }
}
