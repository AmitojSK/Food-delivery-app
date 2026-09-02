package com.fooddelivery.deliveryservice.service;

import com.fooddelivery.deliveryservice.dto.CreateDeliveryRequest;
import com.fooddelivery.deliveryservice.dto.DeliveryResponse;
import com.fooddelivery.deliveryservice.dto.UpdateDeliveryStatusRequest;
import com.fooddelivery.deliveryservice.dto.UpdateLocationRequest;
import com.fooddelivery.deliveryservice.entity.Delivery;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import com.fooddelivery.deliveryservice.exception.DeliveryValidationException;
import com.fooddelivery.deliveryservice.exception.ResourceNotFoundException;
import com.fooddelivery.deliveryservice.mapper.DeliveryMapper;
import com.fooddelivery.deliveryservice.repository.DeliveryRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryMapper deliveryMapper;

    public DeliveryService(DeliveryRepository deliveryRepository, DeliveryMapper deliveryMapper) {
        this.deliveryRepository = deliveryRepository;
        this.deliveryMapper = deliveryMapper;
    }

    @Transactional
    public DeliveryResponse createDelivery(CreateDeliveryRequest request) {
        deliveryRepository.findByOrderId(request.orderId()).ifPresent(existing -> {
            throw new DeliveryValidationException("Delivery for order " + request.orderId() + " already exists");
        });
        Delivery delivery = deliveryMapper.toEntity(request);
        return deliveryMapper.toResponse(deliveryRepository.save(delivery));
    }

    @Transactional(readOnly = true)
    public DeliveryResponse getDelivery(Long id) {
        return deliveryMapper.toResponse(findDelivery(id));
    }

    @Transactional(readOnly = true)
    public DeliveryResponse getDeliveryByOrderId(String orderId) {
        return deliveryMapper.toResponse(deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery for order " + orderId + " was not found")));
    }

    @Transactional(readOnly = true)
    public List<DeliveryResponse> listAvailableDeliveries() {
        return deliveryRepository.findByStatus(DeliveryStatus.PENDING).stream()
                .map(deliveryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DeliveryResponse> listDriverDeliveries(Long driverId, DeliveryStatus status) {
        List<Delivery> deliveries;
        if (status != null) {
            deliveries = deliveryRepository.findByDriverIdAndStatus(driverId, status);
        } else {
            deliveries = deliveryRepository.findByDriverId(driverId);
        }
        return deliveries.stream().map(deliveryMapper::toResponse).toList();
    }

    @Transactional
    public DeliveryResponse acceptDelivery(Long id, Long driverId) {
        if (deliveryRepository.assignPendingDelivery(id, driverId) != 1) {
            throw new DeliveryValidationException("Delivery is no longer available for pickup");
        }
        return deliveryMapper.toResponse(findDelivery(id));
    }

    @Transactional
    public DeliveryResponse updateStatus(Long id, Long driverId, UpdateDeliveryStatusRequest request) {
        Delivery delivery = findDelivery(id);
        if (!driverId.equals(delivery.getDriverId())) {
            throw new DeliveryValidationException("You are not assigned to this delivery");
        }
        if (!isAllowedTransition(delivery.getStatus(), request.status())) {
            throw new DeliveryValidationException(
                    "Cannot transition delivery from " + delivery.getStatus() + " to " + request.status());
        }
        delivery.setStatus(request.status());
        if (request.status() == DeliveryStatus.PICKED_UP) {
            delivery.setPickedUpAt(Instant.now());
        } else if (request.status() == DeliveryStatus.DELIVERED) {
            delivery.setDeliveredAt(Instant.now());
        }
        return deliveryMapper.toResponse(deliveryRepository.save(delivery));
    }

    @Transactional
    public DeliveryResponse updateLocation(Long id, Long driverId, UpdateLocationRequest request) {
        Delivery delivery = findDelivery(id);
        if (!driverId.equals(delivery.getDriverId())) {
            throw new DeliveryValidationException("You are not assigned to this delivery");
        }
        delivery.setDriverLatitude(request.latitude());
        delivery.setDriverLongitude(request.longitude());
        return deliveryMapper.toResponse(deliveryRepository.save(delivery));
    }

    private Delivery findDelivery(Long id) {
        return deliveryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery with id " + id + " was not found"));
    }

    private boolean isAllowedTransition(DeliveryStatus from, DeliveryStatus to) {
        return switch (from) {
            case ASSIGNED -> to == DeliveryStatus.PICKED_UP || to == DeliveryStatus.CANCELLED;
            case PICKED_UP -> to == DeliveryStatus.IN_TRANSIT || to == DeliveryStatus.CANCELLED;
            case IN_TRANSIT -> to == DeliveryStatus.DELIVERED || to == DeliveryStatus.CANCELLED;
            default -> false;
        };
    }
}
