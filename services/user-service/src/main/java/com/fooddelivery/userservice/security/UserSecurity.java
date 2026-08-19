package com.fooddelivery.userservice.security;

import com.fooddelivery.userservice.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("userSecurity")
public class UserSecurity {
    private final UserRepository userRepository;
    public UserSecurity(UserRepository userRepository) { this.userRepository = userRepository; }
    public boolean isCurrentUser(Long userId, Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() && userRepository.findById(userId)
                .map(user -> user.getEmail().equalsIgnoreCase(authentication.getName())).orElse(false);
    }
}
