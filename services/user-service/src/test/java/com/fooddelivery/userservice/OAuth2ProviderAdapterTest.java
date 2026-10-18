package com.fooddelivery.userservice;

import static org.assertj.core.api.Assertions.assertThat;

import com.fooddelivery.userservice.entity.AuthProvider;
import com.fooddelivery.userservice.security.OAuth2ProviderAdapter;
import com.fooddelivery.userservice.security.OAuth2ProviderAdapter.SocialProfile;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

class OAuth2ProviderAdapterTest {

    private final OAuth2ProviderAdapter adapter = new OAuth2ProviderAdapter();

    @Test
    void extractsGoogleProfile() {
        OAuth2User user = oauthUser("sub", Map.of(
                "sub", "google-123",
                "email", "Jane@Example.com",
                "given_name", "Jane",
                "family_name", "Doe"));

        SocialProfile profile = adapter.extract(user, "google");

        assertThat(profile.provider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(profile.providerId()).isEqualTo("google-123");
        assertThat(profile.email()).isEqualTo("jane@example.com");
        assertThat(profile.firstName()).isEqualTo("Jane");
        assertThat(profile.lastName()).isEqualTo("Doe");
    }

    @Test
    void extractsGithubProfileSplittingName() {
        OAuth2User user = oauthUser("id", Map.of(
                "id", 4242,
                "login", "octocat",
                "name", "Mona Lisa",
                "email", "mona@example.com"));

        SocialProfile profile = adapter.extract(user, "github");

        assertThat(profile.provider()).isEqualTo(AuthProvider.GITHUB);
        assertThat(profile.providerId()).isEqualTo("4242");
        assertThat(profile.firstName()).isEqualTo("Mona");
        assertThat(profile.lastName()).isEqualTo("Lisa");
    }

    @Test
    void fallsBackToGithubLoginWhenNameMissing() {
        OAuth2User user = oauthUser("id", Map.of(
                "id", 7,
                "login", "octocat",
                "email", "octo@example.com"));

        SocialProfile profile = adapter.extract(user, "github");

        assertThat(profile.firstName()).isEqualTo("octocat");
        assertThat(profile.email()).isEqualTo("octo@example.com");
    }

    private OAuth2User oauthUser(String nameAttributeKey, Map<String, Object> attributes) {
        return new DefaultOAuth2User(AuthorityUtils.createAuthorityList("ROLE_USER"), attributes, nameAttributeKey);
    }
}
