package com.fooddelivery.deliveryservice.controller;

import com.fooddelivery.deliveryservice.dto.CreateDeliveryRequest;
import com.fooddelivery.deliveryservice.dto.DeliveryResponse;
import com.fooddelivery.deliveryservice.dto.DriverLocationResponse;
import com.fooddelivery.deliveryservice.dto.UpdateDeliveryStatusRequest;
import com.fooddelivery.deliveryservice.dto.UpdateLocationRequest;
import com.fooddelivery.deliveryservice.entity.DeliveryStatus;
import com.fooddelivery.deliveryservice.service.DeliveryService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

    public DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeliveryResponse> createDelivery(@Valid @RequestBody CreateDeliveryRequest request) {
        DeliveryResponse delivery = deliveryService.createDelivery(request);
        return ResponseEntity.created(URI.create("/api/v1/deliveries/" + delivery.id())).body(delivery);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@deliverySecurity.canReadDelivery(#id, authentication)")
    public ResponseEntity<DeliveryResponse> getDelivery(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.getDelivery(id));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("@deliverySecurity.canReadOrderDelivery(#orderId, authentication)")
    public ResponseEntity<DeliveryResponse> getDeliveryByOrderId(@PathVariable String orderId) {
        return ResponseEntity.ok(deliveryService.getDeliveryByOrderId(orderId));
    }

    @GetMapping("/{id}/driver-location")
    @PreAuthorize("@deliverySecurity.canReadDelivery(#id, authentication)")
    public ResponseEntity<DriverLocationResponse> getLiveDriverLocation(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.getLiveDriverLocation(id));
    }

    @GetMapping("/available")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    public ResponseEntity<List<DeliveryResponse>> listAvailableDeliveries() {
        return ResponseEntity.ok(deliveryService.listAvailableDeliveries());
    }

    @GetMapping("/driver/my")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    public ResponseEntity<List<DeliveryResponse>> listMyDeliveries(
            @RequestParam(required = false) DeliveryStatus status,
            Authentication authentication
    ) {
        Long driverId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(deliveryService.listDriverDeliveries(driverId, status));
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    public ResponseEntity<DeliveryResponse> acceptDelivery(@PathVariable Long id, Authentication authentication) {
        Long driverId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(deliveryService.acceptDelivery(id, driverId));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    public ResponseEntity<DeliveryResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDeliveryStatusRequest request,
            Authentication authentication
    ) {
        Long driverId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(deliveryService.updateStatus(id, driverId, request));
    }

    @PatchMapping("/{id}/location")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    public ResponseEntity<DeliveryResponse> updateLocation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLocationRequest request,
            Authentication authentication
    ) {
        Long driverId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(deliveryService.updateLocation(id, driverId, request));
    }
}
