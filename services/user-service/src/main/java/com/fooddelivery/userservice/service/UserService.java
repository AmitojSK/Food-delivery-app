package com.fooddelivery.userservice.service;

import com.fooddelivery.userservice.dto.CreateUserRequest;
import com.fooddelivery.userservice.dto.UpdateUserRequest;
import com.fooddelivery.userservice.dto.UserResponse;
import com.fooddelivery.userservice.entity.User;
import com.fooddelivery.userservice.exception.DuplicateResourceException;
import com.fooddelivery.userservice.exception.ResourceNotFoundException;
import com.fooddelivery.userservice.mapper.UserMapper;
import com.fooddelivery.userservice.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        String phoneNumber = request.phoneNumber().trim();
        ensureEmailAvailable(email, null);
        ensurePhoneNumberAvailable(phoneNumber, null);

        User user = userMapper.toEntity(request);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        return userMapper.toResponse(findUser(id));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = findUser(id);

        if (request.firstName() != null) {
            user.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null) {
            user.setLastName(request.lastName().trim());
        }
        if (request.email() != null) {
            String email = request.email().trim().toLowerCase();
            ensureEmailAvailable(email, id);
            user.setEmail(email);
        }
        if (request.phoneNumber() != null) {
            String phoneNumber = request.phoneNumber().trim();
            ensurePhoneNumberAvailable(phoneNumber, id);
            user.setPhoneNumber(phoneNumber);
        }
        if (request.active() != null) {
            user.setActive(request.active());
        }

        return userMapper.toResponse(user);
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + id + " was not found"));
    }

    private void ensureEmailAvailable(String email, Long currentUserId) {
        userRepository.findByEmail(email)
                .filter(existingUser -> !existingUser.getId().equals(currentUserId))
                .ifPresent(existingUser -> {
                    throw new DuplicateResourceException("Email is already registered");
                });
    }

    private void ensurePhoneNumberAvailable(String phoneNumber, Long currentUserId) {
        userRepository.findByPhoneNumber(phoneNumber)
                .filter(existingUser -> !existingUser.getId().equals(currentUserId))
                .ifPresent(existingUser -> {
                    throw new DuplicateResourceException("Phone number is already registered");
                });
    }
}
