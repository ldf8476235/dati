package com.dati.backend.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expireHours;

    public JwtService(@Value("${app.jwt-secret}") String secret, @Value("${app.jwt-expire-hours}") long expireHours) {
        String normalized = secret.length() < 32 ? secret.repeat(4) : secret;
        this.key = Keys.hmacShaKeyFor(normalized.getBytes(StandardCharsets.UTF_8));
        this.expireHours = expireHours;
    }

    public String createToken(long subjectId, String role, boolean hasPaid) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(subjectId))
                .claim("role", role)
                .claim("hasPaid", hasPaid)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expireHours, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }

    public CurrentUser parse(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        long id = Long.parseLong(claims.getSubject());
        String role = claims.get("role", String.class);
        Boolean hasPaid = claims.get("hasPaid", Boolean.class);
        return new CurrentUser(id, role == null ? "user" : role, Boolean.TRUE.equals(hasPaid));
    }
}
