package com.fooddelivery.userservice.mapper;

import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toEntity(CreateUserRequest request) {
        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPhoneNumber(request.phoneNumber().trim());
        return user;
    }

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole().name(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
