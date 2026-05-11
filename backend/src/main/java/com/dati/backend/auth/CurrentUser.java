package com.dati.backend.auth;

public record CurrentUser(long id, String role, boolean hasPaid) {
    public boolean isAdmin() {
        return "admin".equals(role);
    }
}
