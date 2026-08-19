package com.fooddelivery.userservice.controller;

import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.UpdateUserRequest;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.service.UserService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Create a new user.
     *
     * <p>Accepts a validated {@link CreateUserRequest} payload from the client, delegates
     * creation to {@link UserService}, and returns a 201 Created response with the newly
     * created user's representation.</p>
     *
     * <p>The {@link CreateUserRequest} instance is created by Spring MVC from the JSON
     * request body using an {@code HttpMessageConverter}, and validation is applied via
     * {@code @Valid} before the controller method is invoked.</p>
     *
     * <p>Steps performed:</p>
     * <ol>
     *   <li>Deserialize and validate the incoming {@link CreateUserRequest} body.</li>
     *   <li>Call {@link UserService#createUser(CreateUserRequest)} to persist the user.</li>
     *   <li>Build a Location URI for the created user resource at <code>/api/v1/users/{id}</code>.</li>
     *   <li>Return a {@code ResponseEntity.created(...).body(...)} with HTTP 201 Created.</li>
     * </ol>
     *
     * @param request the user creation payload
     * @return 201 Created with the created {@link UserResponse} and a Location header
     *         pointing to the new resource
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse user = userService.createUser(request);
        return ResponseEntity.created(URI.create("/api/v1/users/" + user.id())).body(user);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#id, authentication)")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(userService.listUsers());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or (@userSecurity.isCurrentUser(#id, authentication) and #request.active == null)")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }
}
