package com.dati.backend.auth;

public final class AuthContext {
    private static final ThreadLocal<CurrentUser> CURRENT = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(CurrentUser user) {
        CURRENT.set(user);
    }

    public static CurrentUser get() {
        return CURRENT.get();
    }

    public static long userId() {
        CurrentUser user = CURRENT.get();
        if (user == null) {
            throw new IllegalStateException("未登录");
        }
        return user.id();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
