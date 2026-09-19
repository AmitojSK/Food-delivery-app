package com.fooddelivery.userservice.service;

import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.LoginRequest;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.entity.AuthProvider;
import com.fooddelivery.userservice.entity.User;
import com.fooddelivery.userservice.entity.UserRole;
import com.fooddelivery.userservice.exception.AuthenticationFailedException;
import com.fooddelivery.userservice.repository.UserRepository;
import com.fooddelivery.userservice.security.GoogleTokenVerifier;
import com.fooddelivery.userservice.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthenticationService(UserService userService, UserRepository userRepository,
                                 PasswordEncoder passwordEncoder, JwtService jwtService,
                                 GoogleTokenVerifier googleTokenVerifier) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    @Transactional
    public AuthenticationResponse register(CreateUserRequest request) {
        UserResponse user = userService.registerCustomer(request);
        User savedUser = userRepository.findById(user.id())
                .orElseThrow(() -> new IllegalStateException("Registered user could not be loaded"));
        return authenticatedResponse(savedUser, user);
    }

    @Transactional(readOnly = true)
    public AuthenticationResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));
        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthenticationFailedException("Invalid email or password");
        }
        return authenticatedResponse(user, new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getPhoneNumber(), user.getRole().name(), user.isActive(), user.getCreatedAt(),
                user.getUpdatedAt()));
    }

    /**
     * Signs in (or signs up) a customer with a verified Google ID token. New emails
     * create a CUSTOMER (keeping the "public sign-up is customer-only" rule); an
     * existing account is linked by email, but only because Google asserts the email
     * is verified. Google users have no password and no phone until checkout.
     */
    @Transactional
    public AuthenticationResponse loginWithGoogle(String idToken) {
        if (!googleTokenVerifier.isConfigured()) {
            throw new AuthenticationFailedException("Google sign-in is not configured");
        }
        GoogleIdToken.Payload payload = googleTokenVerifier.verify(idToken);
        if (payload == null) {
            throw new AuthenticationFailedException("Invalid Google credential");
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new AuthenticationFailedException("Google account email is not verified");
        }
        String email = payload.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User created = new User();
            created.setEmail(email);
            created.setFirstName(claim(payload, "given_name", "Google"));
            created.setLastName(claim(payload, "family_name", "User"));
            created.setRole(UserRole.CUSTOMER);
            created.setAuthProvider(AuthProvider.GOOGLE);
            created.setActive(true);
            return userRepository.save(created);
        });
        if (!user.isActive()) {
            throw new AuthenticationFailedException("Account is disabled");
        }
        return authenticatedResponse(user, new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getPhoneNumber(), user.getRole().name(), user.isActive(), user.getCreatedAt(),
                user.getUpdatedAt()));
    }

    private static String claim(GoogleIdToken.Payload payload, String key, String fallback) {
        Object value = payload.get(key);
        return value == null || value.toString().isBlank() ? fallback : value.toString();
    }

    private AuthenticationResponse authenticatedResponse(User user, UserResponse response) {
        return new AuthenticationResponse(jwtService.generateToken(user), "Bearer", jwtService.getExpirationSeconds(), response);
    }
}
