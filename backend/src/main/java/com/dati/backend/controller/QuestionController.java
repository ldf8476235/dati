package com.dati.backend.controller;

import com.dati.backend.auth.AuthContext;
import com.dati.backend.dto.Requests;
import com.dati.backend.service.QuestionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class QuestionController {
    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping("/questions/sequence")
    public Map<String, Object> sequence(@RequestParam long levelId,
                                        @RequestParam String type,
                                        @RequestParam(defaultValue = "1") int page,
                                        @RequestParam(required = false) Integer pageSize) {
        return questionService.sequence(AuthContext.userId(), levelId, type, page, pageSize);
    }

    @GetMapping("/questions/random")
    public Map<String, Object> random(@RequestParam long levelId,
                                      @RequestParam String type,
                                      @RequestParam(required = false) Integer limit) {
        return questionService.random(AuthContext.userId(), levelId, type, limit);
    }

    @PostMapping("/questions/{questionId}/answer")
    public Map<String, Object> answer(@PathVariable long questionId, @Valid @RequestBody Requests.AnswerQuestion request) {
        return questionService.answer(AuthContext.userId(), questionId, request.answer(), request.mode());
    }

    @GetMapping("/wrong-questions")
    public Map<String, Object> wrong(@RequestParam long levelId,
                                     @RequestParam String type,
                                     @RequestParam(defaultValue = "1") int page,
                                     @RequestParam(defaultValue = "20") int pageSize) {
        return questionService.wrongQuestions(AuthContext.userId(), levelId, type, page, pageSize);
    }

    @GetMapping("/questions/search")
    public Map<String, Object> search(@RequestParam long levelId,
                                      @RequestParam String type,
                                      @RequestParam String keyword,
                                      @RequestParam(defaultValue = "1") int page,
                                      @RequestParam(defaultValue = "20") int pageSize) {
        return questionService.search(AuthContext.userId(), levelId, type, keyword, page, pageSize);
    }
}
