package com.fooddelivery.userservice.dto;

/** A configured social sign-in provider the SPA can offer: {@code id} (registrationId) + display name. */
public record OAuth2ProviderResponse(String id, String name) {
}
