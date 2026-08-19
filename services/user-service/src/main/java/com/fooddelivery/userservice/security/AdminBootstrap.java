package com.fooddelivery.userservice.security;

import com.fooddelivery.userservice.entity.User;
import com.fooddelivery.userservice.entity.UserRole;
import com.fooddelivery.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(prefix = "security.bootstrap-admin", name = "enabled", havingValue = "true")
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          @Value("${security.bootstrap-admin.email}") String email,
                          @Value("${security.bootstrap-admin.password}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            throw new IllegalStateException("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required when admin bootstrap is enabled");
        }
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalStateException("Bootstrap admin email is not registered"));
        user.setRole(UserRole.ADMIN);
        user.setPasswordHash(passwordEncoder.encode(password));
    }
}
