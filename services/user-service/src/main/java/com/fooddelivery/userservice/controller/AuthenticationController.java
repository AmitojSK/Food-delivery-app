package com.fooddelivery.userservice.controller;

import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.GoogleConfigResponse;
import com.fooddelivery.userservice.dto.GoogleSignInRequest;
import com.fooddelivery.userservice.dto.LoginRequest;
import com.fooddelivery.userservice.security.GoogleTokenVerifier;
import com.fooddelivery.userservice.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthenticationController(AuthenticationService authenticationService,
                                    GoogleTokenVerifier googleTokenVerifier) {
        this.authenticationService = authenticationService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authenticationService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authenticationService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthenticationResponse> google(@Valid @RequestBody GoogleSignInRequest request) {
        return ResponseEntity.ok(authenticationService.loginWithGoogle(request.idToken()));
    }

    // Lets the frontend fetch the public client id (and hide the button when unconfigured),
    // so the id is env-driven rather than baked into the built app.
    @GetMapping("/google/config")
    public ResponseEntity<GoogleConfigResponse> googleConfig() {
        return ResponseEntity.ok(new GoogleConfigResponse(googleTokenVerifier.clientId()));
    }
}
