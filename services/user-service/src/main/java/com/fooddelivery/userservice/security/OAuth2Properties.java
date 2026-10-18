package com.fooddelivery.userservice.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * Env-driven OAuth2 social sign-in config (prefix {@code app.oauth2}). Each provider is
 * registered only when both its client id and secret are present, so the service runs with
 * none configured. {@link #successRedirect}/{@link #failureRedirect} are the SPA URLs the
 * login is bounced back to (the token rides in the success URL's fragment).
 */
@ConfigurationProperties(prefix = "app.oauth2")
public class OAuth2Properties {

    private String successRedirect;
    private String failureRedirect;
    private Provider google = new Provider();
    private Provider github = new Provider();

    public String getSuccessRedirect() {
        return successRedirect;
    }

    public void setSuccessRedirect(String successRedirect) {
        this.successRedirect = successRedirect;
    }

    public String getFailureRedirect() {
        return failureRedirect;
    }

    public void setFailureRedirect(String failureRedirect) {
        this.failureRedirect = failureRedirect;
    }

    public Provider getGoogle() {
        return google;
    }

    public void setGoogle(Provider google) {
        this.google = google;
    }

    public Provider getGithub() {
        return github;
    }

    public void setGithub(Provider github) {
        this.github = github;
    }

    public static class Provider {
        private String clientId;
        private String clientSecret;
        private String redirectUri;

        /** A provider counts as configured only with both a client id and secret. */
        public boolean isConfigured() {
            return StringUtils.hasText(clientId) && StringUtils.hasText(clientSecret);
        }

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getClientSecret() {
            return clientSecret;
        }

        public void setClientSecret(String clientSecret) {
            this.clientSecret = clientSecret;
        }

        public String getRedirectUri() {
            return redirectUri;
        }

        public void setRedirectUri(String redirectUri) {
            this.redirectUri = redirectUri;
        }
    }
}
