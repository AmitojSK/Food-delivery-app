package com.fooddelivery.userservice.security;

import com.fooddelivery.userservice.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final SecretKey signingKey;
    private final long expirationMillis;

    public JwtService(@Value("${security.jwt.secret}") String secret,
                      @Value("${security.jwt.expiration}") long expirationMillis) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationMillis = expirationMillis;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getEmail()).claim("userId", user.getId())
                .claim("role", user.getRole().name()).issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMillis))).signWith(signingKey).compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    }

    public long getExpirationSeconds() {
        return expirationMillis / 1000;
    }
}
