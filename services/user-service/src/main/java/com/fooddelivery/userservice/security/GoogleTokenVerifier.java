package com.fooddelivery.userservice.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifies Google ID tokens (from Google Identity Services in the browser).
 * Checks the RS256 signature against Google's rotating public certs, plus the
 * audience (our client id), issuer, and expiry. Disabled (isConfigured=false)
 * when no GOOGLE_CLIENT_ID is set, so the feature is inert until configured.
 */
@Component
public class GoogleTokenVerifier {
    private final String clientId;
    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${security.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.verifier = this.clientId.isBlank() ? null
                : new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(Collections.singletonList(this.clientId))
                        .build();
    }

    public boolean isConfigured() {
        return verifier != null;
    }

    public String clientId() {
        return clientId;
    }

    /** Returns the verified payload, or null if the token is missing/invalid. */
    public GoogleIdToken.Payload verify(String idTokenString) {
        if (verifier == null || idTokenString == null || idTokenString.isBlank()) return null;
        try {
            GoogleIdToken token = verifier.verify(idTokenString);
            return token == null ? null : token.getPayload();
        } catch (Exception e) {
            return null;
        }
    }
}
