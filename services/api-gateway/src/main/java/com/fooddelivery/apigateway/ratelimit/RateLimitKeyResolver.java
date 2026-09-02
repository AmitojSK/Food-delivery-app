package com.fooddelivery.apigateway.ratelimit;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.net.InetSocketAddress;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import reactor.core.publisher.Mono;

/**
 * Rate-limit bucket key: {route-id}:{subject}. The subject is the JWT subject when a
 * token is present (so a user is limited consistently across IPs/devices) and falls back
 * to the caller's IP for anonymous routes such as login/registration. Scoping by route id
 * keeps a burst on one endpoint (e.g. checkout) from consuming a user's budget on another
 * (e.g. delivery acceptance).
 */
@Component
public class RateLimitKeyResolver implements KeyResolver {

    private final SecretKey signingKey;

    public RateLimitKeyResolver(@Value("${security.jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    @Override
    public Mono<String> resolve(ServerWebExchange exchange) {
        return Mono.just(routeId(exchange) + ":" + subject(exchange));
    }

    private String routeId(ServerWebExchange exchange) {
        Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        return route != null ? route.getId() : "unknown-route";
    }

    private String subject(ServerWebExchange exchange) {
        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                Claims claims = Jwts.parser().verifyWith(signingKey).build()
                        .parseSignedClaims(authorization.substring(7)).getPayload();
                if (claims.getSubject() != null) {
                    return claims.getSubject();
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                // Falls through to IP-based limiting for an invalid/expired token.
            }
        }
        InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null && remoteAddress.getAddress() != null
                ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }
}
