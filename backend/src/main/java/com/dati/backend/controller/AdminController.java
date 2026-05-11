package com.dati.backend.controller;

import com.dati.backend.dto.Requests;
import com.dati.backend.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@Valid @RequestBody Requests.AdminLogin request) {
        return adminService.login(request.username(), request.password());
    }

    @GetMapping("/questions")
    public Map<String, Object> questions(@RequestParam(required = false) Long levelId,
                                         @RequestParam(required = false) String type,
                                         @RequestParam(required = false) String keyword,
                                         @RequestParam(defaultValue = "1") int page,
                                         @RequestParam(defaultValue = "20") int pageSize) {
        return adminService.listQuestions(levelId, type, keyword, page, pageSize);
    }

    @PostMapping("/questions")
    public Map<String, Object> create(@Valid @RequestBody Requests.AdminQuestion request) {
        return adminService.createQuestion(request);
    }

    @PutMapping("/questions/{id}")
    public Map<String, Object> update(@PathVariable long id, @Valid @RequestBody Requests.AdminQuestion request) {
        return adminService.updateQuestion(id, request);
    }

    @DeleteMapping("/questions/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        return adminService.disableQuestion(id);
    }

    @PostMapping("/questions/import")
    public Map<String, Object> importQuestions(@RequestParam long levelId, @RequestPart("file") MultipartFile file) {
        return adminService.importQuestions(levelId, file);
    }
}
