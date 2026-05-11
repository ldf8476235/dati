package com.dati.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class Requests {
    private Requests() {
    }

    public record WechatLogin(@NotBlank String code, String nickname, String avatarUrl) {
    }

    public record CreateOrder(@NotBlank String product) {
    }

    public record AnswerQuestion(@NotBlank String answer, String mode) {
    }

    public record CreateExam(@NotNull Long levelId) {
    }

    public record SubmitExam(@NotNull List<ExamAnswer> answers) {
    }

    public record ExamAnswer(@NotNull Long questionId, String answer) {
    }

    public record AdminLogin(@NotBlank String username, @NotBlank String password) {
    }

    public record AdminQuestion(@NotNull Long levelId, @NotBlank String type, @NotBlank String content,
                                String optionA, String optionB, String optionC, String optionD,
                                @NotBlank String answer, String analysis, Integer sortNo, Boolean enabled) {
    }
}
