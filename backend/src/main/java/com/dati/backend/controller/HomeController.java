package com.dati.backend.controller;

import com.dati.backend.auth.AuthContext;
import com.dati.backend.service.QuestionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HomeController {
    private final QuestionService questionService;

    public HomeController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping("/home")
    public Map<String, Object> home() {
        return questionService.home(AuthContext.userId());
    }
}
