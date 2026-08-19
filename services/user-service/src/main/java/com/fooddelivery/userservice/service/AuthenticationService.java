package com.fooddelivery.userservice.service;

import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.LoginRequest;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.entity.User;
import com.fooddelivery.userservice.exception.AuthenticationFailedException;
import com.fooddelivery.userservice.repository.UserRepository;
import com.fooddelivery.userservice.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthenticationService(UserService userService, UserRepository userRepository,
                                 PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthenticationResponse register(CreateUserRequest request) {
        UserResponse user = userService.createUser(request);
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

    private AuthenticationResponse authenticatedResponse(User user, UserResponse response) {
        return new AuthenticationResponse(jwtService.generateToken(user), "Bearer", jwtService.getExpirationSeconds(), response);
    }
}
