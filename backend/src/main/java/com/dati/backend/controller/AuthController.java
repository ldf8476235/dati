package com.dati.backend.controller;

import com.dati.backend.dto.Requests;
import com.dati.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/wechat-login")
    public Map<String, Object> wechatLogin(@Valid @RequestBody Requests.WechatLogin request) {
        return userService.wechatLogin(request.code(), request.nickname(), request.avatarUrl());
    }
}
