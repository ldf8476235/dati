package com.dati.backend.controller;

import com.dati.backend.auth.AuthContext;
import com.dati.backend.dto.Requests;
import com.dati.backend.service.ExamService;
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
@RequestMapping("/api/exams")
public class ExamController {
    private final ExamService examService;

    public ExamController(ExamService examService) {
        this.examService = examService;
    }

    @PostMapping
    public Map<String, Object> create(@Valid @RequestBody Requests.CreateExam request) {
        return examService.create(AuthContext.userId(), request.levelId());
    }

    @PostMapping("/{examId}/submit")
    public Map<String, Object> submit(@PathVariable long examId, @Valid @RequestBody Requests.SubmitExam request) {
        return examService.submit(AuthContext.userId(), examId, request.answers());
    }

    @GetMapping("/history")
    public Map<String, Object> history(@RequestParam long levelId,
                                       @RequestParam(defaultValue = "1") int page,
                                       @RequestParam(defaultValue = "20") int pageSize) {
        return examService.history(AuthContext.userId(), levelId, page, pageSize);
    }
}
