package com.dati.backend.config;

import com.dati.backend.auth.AuthContext;
import com.dati.backend.auth.CurrentUser;
import com.dati.backend.auth.JwtService;
import com.dati.backend.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final JwtService jwtService;

    public AuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();
        if (isPublic(path)) {
            return true;
        }
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw ApiException.unauthorized("未登录");
        }
        CurrentUser user;
        try {
            user = jwtService.parse(auth.substring(7));
        } catch (RuntimeException ex) {
            throw ApiException.unauthorized("登录已失效，请重新登录");
        }
        if (path.startsWith("/api/admin/") && !user.isAdmin()) {
            throw ApiException.forbidden("需要管理员权限");
        }
        AuthContext.set(user);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthContext.clear();
    }

    private boolean isPublic(String path) {
        return path.equals("/api/auth/wechat-login")
                || path.equals("/api/admin/auth/login")
                || path.equals("/api/pay/wechat/notify")
                || path.equals("/actuator/health");
    }
}
