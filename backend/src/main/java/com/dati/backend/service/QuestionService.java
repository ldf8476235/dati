package com.dati.backend.service;

import com.dati.backend.common.ApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static com.dati.backend.service.QuestionMapper.QUESTION_ROW_MAPPER;

@Service
public class QuestionService {
    private final JdbcTemplate jdbc;
    private final UserService userService;

    public QuestionService(JdbcTemplate jdbc, UserService userService) {
        this.jdbc = jdbc;
        this.userService = userService;
    }

    public Map<String, Object> home(long userId, Long requestedLevelId) {
        Map<String, Object> user = userService.loadUser(userId);
        List<QuestionMapper.Level> levels = levels();
        long levelId = resolveLevelId(levels, requestedLevelId);
        Integer total = jdbc.queryForObject("select count(*) from questions where enabled = 1 and (? = 0 or level_id = ?)",
                Integer.class, levelId, levelId);
        Integer wrong = jdbc.queryForObject("""
                select count(*) from user_question_records r
                join questions q on q.id = r.question_id
                where r.user_id = ? and r.wrong_count > 0 and (? = 0 or q.level_id = ?)
                """, Integer.class, userId, levelId, levelId);
        Integer answered = jdbc.query("select answered_count from user_practice_progress where user_id = ? and level_id = ? order by updated_at desc limit 1",
                rs -> rs.next() ? rs.getInt(1) : 0, userId, levelId);
        return Map.of(
                "hasPaid", user.get("hasPaid"),
                "levels", levels,
                "currentLevelId", levelId,
                "stats", Map.of(
                        "totalQuestions", total == null ? 0 : total,
                        "sequenceProgress", (answered == null ? 0 : answered) + "/" + (total == null ? 0 : total),
                        "wrongCount", wrong == null ? 0 : wrong
                )
        );
    }

    private long resolveLevelId(List<QuestionMapper.Level> levels, Long requestedLevelId) {
        if (levels.isEmpty()) {
            return 0;
        }
        if (requestedLevelId != null) {
            for (QuestionMapper.Level level : levels) {
                if (level.id() == requestedLevelId) {
                    return level.id();
                }
            }
        }
        return levels.get(0).id();
    }

    public List<QuestionMapper.Level> levels() {
        return jdbc.query("select * from question_levels where enabled = 1 order by sort_order asc", QuestionMapper.LEVEL_ROW_MAPPER);
    }

    public Map<String, Object> sequence(long userId, long levelId, String type, int page, Integer pageSize) {
        userService.requirePaid(userId);
        validateType(type);
        Integer total = jdbc.queryForObject("select count(*) from questions where level_id = ? and type = ? and enabled = 1",
                Integer.class, levelId, type);
        int resolvedPageSize = pageSize == null || pageSize <= 0 ? (total == null ? 0 : total) : pageSize;
        int offset = (Math.max(page, 1) - 1) * resolvedPageSize;
        List<QuestionMapper.PublicQuestion> items = jdbc.query("""
                select * from questions
                where level_id = ? and type = ? and enabled = 1
                order by sort_no asc, id asc
                limit ? offset ?
                """, QUESTION_ROW_MAPPER, levelId, type, resolvedPageSize, offset).stream().map(QuestionMapper::publicQuestion).toList();
        return Map.of("items", items, "page", page, "pageSize", resolvedPageSize, "total", total == null ? 0 : total);
    }

    public Map<String, Object> random(long userId, long levelId, String type, Integer limit) {
        userService.requirePaid(userId);
        validateType(type);
        Integer total = jdbc.queryForObject("select count(*) from questions where level_id = ? and type = ? and enabled = 1",
                Integer.class, levelId, type);
        int resolvedLimit = limit == null || limit <= 0 ? (total == null ? 0 : total) : Math.min(limit, total == null ? 0 : total);
        List<QuestionMapper.PublicQuestion> items = jdbc.query("""
                select * from questions
                where level_id = ? and type = ? and enabled = 1
                order by rand()
                limit ?
                """, QUESTION_ROW_MAPPER, levelId, type, resolvedLimit)
                .stream().map(QuestionMapper::publicQuestion).toList();
        return Map.of("items", items, "total", total == null ? 0 : total, "limit", resolvedLimit);
    }

    @Transactional
    public Map<String, Object> answer(long userId, long questionId, String answer, String mode) {
        userService.requirePaid(userId);
        QuestionMapper.Question q = findQuestion(questionId);
        String normalized = normalizeAnswer(q.type(), answer);
        boolean correct = q.answer().equalsIgnoreCase(normalized);
        jdbc.update("""
                insert into user_question_records(user_id, question_id, last_answer, is_correct, wrong_count, correct_count, last_answered_at)
                values (?, ?, ?, ?, ?, ?, now())
                on duplicate key update
                  last_answer = values(last_answer),
                  is_correct = values(is_correct),
                  wrong_count = wrong_count + if(values(is_correct) = 0, 1, 0),
                  correct_count = correct_count + if(values(is_correct) = 1, 1, 0),
                  last_answered_at = now()
                """, userId, questionId, normalized, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0);
        if ("sequence".equals(mode)) {
            jdbc.update("""
                    insert into user_practice_progress(user_id, level_id, type, last_question_id, answered_count, updated_at)
                    values (?, ?, ?, ?, 1, now())
                    on duplicate key update last_question_id = values(last_question_id), answered_count = answered_count + 1, updated_at = now()
                    """, userId, q.levelId(), q.type(), q.id());
        }
        Integer wrongCount = jdbc.queryForObject("select wrong_count from user_question_records where user_id = ? and question_id = ?",
                Integer.class, userId, questionId);
        return Map.of(
                "correct", correct,
                "correctAnswer", q.answer(),
                "analysis", q.analysis() == null ? "" : q.analysis(),
                "wrongCount", wrongCount == null ? 0 : wrongCount
        );
    }

    public Map<String, Object> wrongQuestions(long userId, long levelId, String type, int page, int pageSize) {
        userService.requirePaid(userId);
        validateType(type);
        int offset = (Math.max(page, 1) - 1) * pageSize;
        List<Map<String, Object>> items = jdbc.queryForList("""
                select q.id, q.type, q.content, q.option_a optionA, q.option_b optionB, q.option_c optionC, q.option_d optionD,
                       q.answer correctAnswer, q.analysis analysis,
                       r.wrong_count wrongCount, r.last_answered_at lastAnsweredAt
                from user_question_records r
                join questions q on q.id = r.question_id
                where r.user_id = ? and r.wrong_count > 0 and q.level_id = ? and q.type = ? and q.enabled = 1
                order by r.last_answered_at desc
                limit ? offset ?
                """, userId, levelId, type, pageSize, offset);
        Integer total = jdbc.queryForObject("""
                select count(*) from user_question_records r join questions q on q.id = r.question_id
                where r.user_id = ? and r.wrong_count > 0 and q.level_id = ? and q.type = ? and q.enabled = 1
                """, Integer.class, userId, levelId, type);
        return Map.of("items", items, "page", page, "pageSize", pageSize, "total", total == null ? 0 : total);
    }

    @Transactional
    public void removeWrongQuestion(long userId, long questionId) {
        jdbc.update("""
                update user_question_records
                set wrong_count = 0
                where user_id = ? and question_id = ?
                """, userId, questionId);
    }

    @Transactional
    public void clearWrongQuestions(long userId) {
        jdbc.update("""
                update user_question_records
                set wrong_count = 0
                where user_id = ? and wrong_count > 0
                """, userId);
    }

    public Map<String, Object> search(long userId, long levelId, String type, String keyword, int page, int pageSize) {
        userService.requirePaid(userId);
        validateType(type);
        int offset = (Math.max(page, 1) - 1) * pageSize;
        String value = keyword == null ? "" : keyword.trim();
        String like = "%" + value + "%";
        List<QuestionMapper.PublicQuestion> items = jdbc.query("""
                select * from questions
                where level_id = ? and type = ? and enabled = 1
                  and (? = '' or content like ? or analysis like ?)
                order by sort_no asc, id asc
                limit ? offset ?
                """, QUESTION_ROW_MAPPER, levelId, type, value, like, like, pageSize, offset)
                .stream().map(QuestionMapper::publicQuestion).toList();
        Integer total = jdbc.queryForObject("""
                select count(*) from questions
                where level_id = ? and type = ? and enabled = 1
                  and (? = '' or content like ? or analysis like ?)
                """, Integer.class, levelId, type, value, like, like);
        return Map.of("items", items, "page", page, "pageSize", pageSize, "total", total == null ? 0 : total);
    }

    public QuestionMapper.Question findQuestion(long id) {
        List<QuestionMapper.Question> list = jdbc.query("select * from questions where id = ? and enabled = 1", QUESTION_ROW_MAPPER, id);
        if (list.isEmpty()) {
            throw ApiException.notFound("题目不存在");
        }
        return list.get(0);
    }

    public String normalizeAnswer(String type, String answer) {
        if (answer == null || answer.isBlank()) {
            return "";
        }
        String value = answer.trim();
        if ("single_choice".equals(type)) {
            value = value.toUpperCase();
            if (!List.of("A", "B", "C", "D").contains(value)) {
                throw ApiException.badRequest("选择题答案必须是 A/B/C/D");
            }
            return value;
        }
        if (List.of("true", "正确", "√", "对").contains(value)) {
            return "true";
        }
        if (List.of("false", "错误", "×", "错").contains(value)) {
            return "false";
        }
        throw ApiException.badRequest("判断题答案必须是 true/false 或 正确/错误");
    }

    public void validateType(String type) {
        if (!List.of("single_choice", "true_false").contains(type)) {
            throw ApiException.badRequest("type 必须是 single_choice 或 true_false");
        }
    }
}
