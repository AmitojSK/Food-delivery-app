package com.fooddelivery.userservice.controller;

import com.fooddelivery.userservice.dto.AuthenticationResponse;
import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.LoginRequest;
import com.fooddelivery.userservice.dto.OAuth2ProviderResponse;
import com.fooddelivery.userservice.service.AuthenticationService;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    public AuthenticationController(AuthenticationService authenticationService,
                                    ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository) {
        this.authenticationService = authenticationService;
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authenticationService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authenticationService.login(request));
    }

    /**
     * Lists the social providers that are actually configured, so the SPA shows a button only
     * for enabled providers. The frontend then starts a flow by navigating to
     * {@code /user-api/oauth2/authorization/<id>}. Empty when none are configured.
     */
    @GetMapping("/oauth2/providers")
    public ResponseEntity<List<OAuth2ProviderResponse>> oauth2Providers() {
        List<OAuth2ProviderResponse> providers = new ArrayList<>();
        ClientRegistrationRepository repository = clientRegistrationRepository.getIfAvailable();
        if (repository instanceof InMemoryClientRegistrationRepository inMemory) {
            for (ClientRegistration registration : inMemory) {
                providers.add(new OAuth2ProviderResponse(registration.getRegistrationId(),
                        registration.getClientName()));
            }
        }
        return ResponseEntity.ok(providers);
    }
}
