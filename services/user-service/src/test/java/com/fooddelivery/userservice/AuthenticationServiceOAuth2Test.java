package com.fooddelivery.userservice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.entity.AuthProvider;
import com.fooddelivery.userservice.entity.User;
import com.fooddelivery.userservice.entity.UserRole;
import com.fooddelivery.userservice.exception.AuthenticationFailedException;
import com.fooddelivery.userservice.mapper.UserMapper;
import com.fooddelivery.userservice.repository.UserRepository;
import com.fooddelivery.userservice.security.JwtService;
import com.fooddelivery.userservice.security.OAuth2ProviderAdapter.SocialProfile;
import com.fooddelivery.userservice.service.AuthenticationService;
import com.fooddelivery.userservice.service.UserService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthenticationServiceOAuth2Test {

    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private UserMapper userMapper;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        authenticationService = new AuthenticationService(userService, userRepository, userMapper,
                passwordEncoder, jwtService);
        when(jwtService.generateToken(any())).thenReturn("jwt-token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            return new UserResponse(1L, u.getFirstName(), u.getLastName(), u.getEmail(),
                    u.getPhoneNumber(), u.getRole().name(), u.isActive(), null, null);
        });
    }

    @Test
    void createsCustomerForNewSocialIdentity() {
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.GITHUB, "99")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());

        SocialProfile profile = new SocialProfile(AuthProvider.GITHUB, "99", "new@example.com", "Octo", "Cat");
        AuthenticationResponse response = authenticationService.completeOAuth2Login(profile);

        assertThat(response.accessToken()).isEqualTo("jwt-token");
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThat(saved.getValue().getAuthProvider()).isEqualTo(AuthProvider.GITHUB);
        assertThat(saved.getValue().getProviderId()).isEqualTo("99");
        assertThat(saved.getValue().getEmail()).isEqualTo("new@example.com");
    }

    @Test
    void returnsExistingUserWhenProviderIdentityMatches() {
        User existing = user("match@example.com", AuthProvider.GOOGLE, "sub-1", UserRole.CUSTOMER, true);
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.GOOGLE, "sub-1"))
                .thenReturn(Optional.of(existing));

        SocialProfile profile = new SocialProfile(AuthProvider.GOOGLE, "sub-1", "match@example.com", "A", "B");
        AuthenticationResponse response = authenticationService.completeOAuth2Login(profile);

        assertThat(response.user().email()).isEqualTo("match@example.com");
        verify(userRepository, never()).save(any());
    }

    @Test
    void linksByVerifiedEmailAndBackfillsProviderId() {
        // A Google account created by the old flow: provider GOOGLE but no providerId yet.
        User legacy = user("legacy@example.com", AuthProvider.GOOGLE, null, UserRole.CUSTOMER, true);
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.GOOGLE, "sub-new"))
                .thenReturn(Optional.empty());
        when(userRepository.findByEmail("legacy@example.com")).thenReturn(Optional.of(legacy));

        SocialProfile profile = new SocialProfile(AuthProvider.GOOGLE, "sub-new", "legacy@example.com", "A", "B");
        authenticationService.completeOAuth2Login(profile);

        assertThat(legacy.getProviderId()).isEqualTo("sub-new");
        assertThat(legacy.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        verify(userRepository).save(legacy);
    }

    @Test
    void rejectsNewSocialAccountWithoutEmail() {
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.GITHUB, "77")).thenReturn(Optional.empty());

        SocialProfile profile = new SocialProfile(AuthProvider.GITHUB, "77", null, "No", "Email");
        assertThatThrownBy(() -> authenticationService.completeOAuth2Login(profile))
                .isInstanceOf(AuthenticationFailedException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsDisabledAccount() {
        User disabled = user("off@example.com", AuthProvider.GOOGLE, "sub-off", UserRole.CUSTOMER, false);
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.GOOGLE, "sub-off"))
                .thenReturn(Optional.of(disabled));

        SocialProfile profile = new SocialProfile(AuthProvider.GOOGLE, "sub-off", "off@example.com", "A", "B");
        assertThatThrownBy(() -> authenticationService.completeOAuth2Login(profile))
                .isInstanceOf(AuthenticationFailedException.class);
    }

    private User user(String email, AuthProvider provider, String providerId, UserRole role, boolean active) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName("First");
        user.setLastName("Last");
        user.setAuthProvider(provider);
        user.setProviderId(providerId);
        user.setRole(role);
        user.setActive(active);
        return user;
    }
}
