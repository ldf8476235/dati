package com.dati.backend.service;

import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class QuestionMapper {
    private QuestionMapper() {
    }

    public record Level(long id, String stage, String stageName, int levelNo, String name, int sortOrder) {
    }

    public record Question(long id, long levelId, String type, String content, String optionA, String optionB,
                           String optionC, String optionD, String answer, String analysis, int sortNo,
                           boolean enabled) {
        public List<String> options() {
            List<String> options = new ArrayList<>();
            if (optionA != null) options.add(optionA);
            if (optionB != null) options.add(optionB);
            if (optionC != null) options.add(optionC);
            if (optionD != null) options.add(optionD);
            return options;
        }
    }

    public record PublicQuestion(long id, Integer order, String type, String content, List<String> options,
                                 String correctAnswer, String analysis) {
    }

    public record QuestionWithRecord(long id, String type, String content, List<String> options, int wrongCount,
                                     LocalDateTime lastAnsweredAt) {
    }

    public static final RowMapper<Level> LEVEL_ROW_MAPPER = (rs, rowNum) -> new Level(
            rs.getLong("id"),
            rs.getString("stage"),
            rs.getString("stage_name"),
            rs.getInt("level_no"),
            rs.getString("name"),
            rs.getInt("sort_order")
    );

    public static final RowMapper<Question> QUESTION_ROW_MAPPER = new RowMapper<>() {
        @Override
        public Question mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Question(
                    rs.getLong("id"),
                    rs.getLong("level_id"),
                    rs.getString("type"),
                    rs.getString("content"),
                    rs.getString("option_a"),
                    rs.getString("option_b"),
                    rs.getString("option_c"),
                    rs.getString("option_d"),
                    rs.getString("answer"),
                    rs.getString("analysis"),
                    rs.getInt("sort_no"),
                    rs.getInt("enabled") == 1
            );
        }
    };

    public static PublicQuestion publicQuestion(Question q) {
        return new PublicQuestion(q.id(), null, q.type(), q.content(), q.options(), q.answer(), q.analysis());
    }

    public static PublicQuestion publicQuestion(Question q, int order) {
        return new PublicQuestion(q.id(), order, q.type(), q.content(), q.options(), q.answer(), q.analysis());
    }
}
