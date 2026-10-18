package com.fooddelivery.userservice.service;

import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.LoginRequest;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.entity.User;
import com.fooddelivery.userservice.entity.UserRole;
import com.fooddelivery.userservice.exception.AuthenticationFailedException;
import com.fooddelivery.userservice.mapper.UserMapper;
import com.fooddelivery.userservice.repository.UserRepository;
import com.fooddelivery.userservice.security.JwtService;
import com.fooddelivery.userservice.security.OAuth2ProviderAdapter.SocialProfile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final UserService userService;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthenticationService(UserService userService, UserRepository userRepository, UserMapper userMapper,
                                 PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthenticationResponse register(CreateUserRequest request) {
        UserResponse user = userService.registerCustomer(request);
        User savedUser = userRepository.findById(user.id())
                .orElseThrow(() -> new IllegalStateException("Registered user could not be loaded"));
        return authenticatedResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public AuthenticationResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));
        if (!user.isActive() || user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthenticationFailedException("Invalid email or password");
        }
        return authenticatedResponse(user);
    }

    /**
     * Signs in (or signs up) a user from a verified social profile. Resolution order:
     * (1) match the exact provider identity; (2) else link to an existing account by verified
     * email — a social sign-up/login only ever touches an account whose email the provider
     * asserts as verified; (3) else create a new CUSTOMER (public sign-up stays customer-only).
     * Accounts created by the earlier Google flow (no provider_id yet) are backfilled in step 2.
     */
    @Transactional
    public AuthenticationResponse completeOAuth2Login(SocialProfile profile) {
        User user = userRepository.findByAuthProviderAndProviderId(profile.provider(), profile.providerId())
                .orElseGet(() -> linkOrCreate(profile));
        if (!user.isActive()) {
            throw new AuthenticationFailedException("Account is disabled");
        }
        return authenticatedResponse(user);
    }

    private User linkOrCreate(SocialProfile profile) {
        if (profile.email() != null) {
            User existing = userRepository.findByEmail(profile.email()).orElse(null);
            if (existing != null) {
                // Link this social identity to the existing (verified-email) account. The row
                // keeps its id, role, and any password; the provider label points at the latest
                // social provider used.
                existing.setAuthProvider(profile.provider());
                existing.setProviderId(profile.providerId());
                return userRepository.save(existing);
            }
        } else {
            // A new account needs an email (NOT NULL, unique). GitHub can withhold it.
            throw new AuthenticationFailedException(
                    "No verified email was available from the provider; add/verify an email on that account to sign in");
        }
        User created = new User();
        created.setEmail(profile.email());
        created.setFirstName(profile.firstName());
        created.setLastName(profile.lastName());
        created.setRole(UserRole.CUSTOMER);
        created.setAuthProvider(profile.provider());
        created.setProviderId(profile.providerId());
        created.setActive(true);
        return userRepository.save(created);
    }

    private AuthenticationResponse authenticatedResponse(User user) {
        return new AuthenticationResponse(jwtService.generateToken(user), "Bearer",
                jwtService.getExpirationSeconds(), userMapper.toResponse(user));
    }
}
