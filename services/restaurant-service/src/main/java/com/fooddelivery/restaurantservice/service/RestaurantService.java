package com.fooddelivery.restaurantservice.service;

import com.fooddelivery.restaurantservice.dto.CreateRestaurantRequest;
import com.fooddelivery.restaurantservice.dto.RestaurantResponse;
import com.fooddelivery.restaurantservice.dto.UpdateRestaurantRequest;
import com.fooddelivery.restaurantservice.entity.Restaurant;
import com.fooddelivery.restaurantservice.exception.DuplicateResourceException;
import com.fooddelivery.restaurantservice.exception.ResourceNotFoundException;
import com.fooddelivery.restaurantservice.mapper.RestaurantMapper;
import com.fooddelivery.restaurantservice.repository.RestaurantRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final RestaurantMapper restaurantMapper;

    public RestaurantService(RestaurantRepository restaurantRepository, RestaurantMapper restaurantMapper) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantMapper = restaurantMapper;
    }

    @Transactional
    public RestaurantResponse createRestaurant(CreateRestaurantRequest request) {
        ensureNameAvailable(request.name().trim(), null);
        ensureContactEmailAvailable(request.contactEmail().trim().toLowerCase(), null);
        ensureContactPhoneAvailable(request.contactPhone().trim(), null);

        Restaurant restaurant = restaurantMapper.toEntity(request);
        return restaurantMapper.toResponse(restaurantRepository.save(restaurant));
    }

    @Transactional(readOnly = true)
    public RestaurantResponse getRestaurant(Long id) {
        return restaurantMapper.toResponse(findRestaurant(id));
    }

    @Transactional(readOnly = true)
    public List<RestaurantResponse> listRestaurants(String city, Boolean active) {
        List<Restaurant> restaurants;
        if (city != null && active != null) {
            restaurants = restaurantRepository.findByCityIgnoreCaseAndActive(city.trim(), active);
        } else if (city != null) {
            restaurants = restaurantRepository.findByCityIgnoreCase(city.trim());
        } else if (active != null) {
            restaurants = restaurantRepository.findByActive(active);
        } else {
            restaurants = restaurantRepository.findAll();
        }

        return restaurants.stream()
                .map(restaurantMapper::toResponse)
                .toList();
    }

    @Transactional
    public RestaurantResponse updateRestaurant(Long id, UpdateRestaurantRequest request) {
        Restaurant restaurant = findRestaurant(id);

        if (request.name() != null) {
            String name = request.name().trim();
            ensureNameAvailable(name, id);
            restaurant.setName(name);
        }
        if (request.cuisineType() != null) {
            restaurant.setCuisineType(request.cuisineType().trim());
        }
        if (request.streetAddress() != null) {
            restaurant.setStreetAddress(request.streetAddress().trim());
        }
        if (request.city() != null) {
            restaurant.setCity(request.city().trim());
        }
        if (request.state() != null) {
            restaurant.setState(request.state().trim());
        }
        if (request.postalCode() != null) {
            restaurant.setPostalCode(request.postalCode().trim());
        }
        if (request.contactEmail() != null) {
            String contactEmail = request.contactEmail().trim().toLowerCase();
            ensureContactEmailAvailable(contactEmail, id);
            restaurant.setContactEmail(contactEmail);
        }
        if (request.contactPhone() != null) {
            String contactPhone = request.contactPhone().trim();
            ensureContactPhoneAvailable(contactPhone, id);
            restaurant.setContactPhone(contactPhone);
        }
        if (request.active() != null) {
            restaurant.setActive(request.active());
        }

        return restaurantMapper.toResponse(restaurant);
    }

    private Restaurant findRestaurant(Long id) {
        return restaurantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant with id " + id + " was not found"));
    }

    private void ensureNameAvailable(String name, Long currentRestaurantId) {
        restaurantRepository.findByName(name)
                .filter(restaurant -> !restaurant.getId().equals(currentRestaurantId))
                .ifPresent(restaurant -> {
                    throw new DuplicateResourceException("Restaurant name is already registered");
                });
    }

    private void ensureContactEmailAvailable(String contactEmail, Long currentRestaurantId) {
        restaurantRepository.findByContactEmail(contactEmail)
                .filter(restaurant -> !restaurant.getId().equals(currentRestaurantId))
                .ifPresent(restaurant -> {
                    throw new DuplicateResourceException("Contact email is already registered");
                });
    }

    private void ensureContactPhoneAvailable(String contactPhone, Long currentRestaurantId) {
        restaurantRepository.findByContactPhone(contactPhone)
                .filter(restaurant -> !restaurant.getId().equals(currentRestaurantId))
                .ifPresent(restaurant -> {
                    throw new DuplicateResourceException("Contact phone is already registered");
                });
    }
}
