package com.dati.backend.service;

import com.dati.backend.common.ApiException;
import com.dati.backend.dto.Requests;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.dati.backend.service.QuestionMapper.QUESTION_ROW_MAPPER;

@Service
public class ExamService {
    private static final int CHOICE_COUNT = 80;
    private static final int JUDGE_COUNT = 20;
    private static final int DURATION_SECONDS = 3600;

    private final JdbcTemplate jdbc;
    private final UserService userService;
    private final QuestionService questionService;

    public ExamService(JdbcTemplate jdbc, UserService userService, QuestionService questionService) {
        this.jdbc = jdbc;
        this.userService = userService;
        this.questionService = questionService;
    }

    @Transactional
    public Map<String, Object> create(long userId, long levelId) {
        userService.requirePaid(userId);
        List<QuestionMapper.Question> choices = randomQuestions(levelId, "single_choice", CHOICE_COUNT);
        List<QuestionMapper.Question> judges = randomQuestions(levelId, "true_false", JUDGE_COUNT);
        if (choices.size() < CHOICE_COUNT || judges.size() < JUDGE_COUNT) {
            throw ApiException.badRequest("题库数量不足，模拟考试需要 80 道选择题和 20 道判断题");
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    insert into exam_sessions(user_id, level_id, status, total_score, score, choice_count, judge_count, duration_seconds, started_at)
                    values (?, ?, 'doing', 100, 0, ?, ?, ?, now())
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setLong(2, levelId);
            ps.setInt(3, CHOICE_COUNT);
            ps.setInt(4, JUDGE_COUNT);
            ps.setInt(5, DURATION_SECONDS);
            return ps;
        }, keyHolder);
        long examId = keyHolder.getKey().longValue();
        int order = 1;
        for (QuestionMapper.Question q : choices) {
            jdbc.update("insert into exam_session_questions(exam_session_id, question_id, question_order, score) values (?, ?, ?, 1)",
                    examId, q.id(), order++);
        }
        for (QuestionMapper.Question q : judges) {
            jdbc.update("insert into exam_session_questions(exam_session_id, question_id, question_order, score) values (?, ?, ?, 1)",
                    examId, q.id(), order++);
        }
        LocalDateTime startedAt = jdbc.queryForObject("select started_at from exam_sessions where id = ?", LocalDateTime.class, examId);
        List<QuestionMapper.PublicQuestion> questions = loadExamQuestions(examId);
        return Map.of("examId", examId, "durationSeconds", DURATION_SECONDS, "startedAt", startedAt, "questions", questions);
    }

    @Transactional
    public Map<String, Object> submit(long userId, long examId, List<Requests.ExamAnswer> answers) {
        Map<String, Object> exam = jdbc.query("select * from exam_sessions where id = ? and user_id = ?",
                rs -> rs.next() ? Map.of(
                        "status", rs.getString("status"),
                        "startedAt", rs.getObject("started_at", LocalDateTime.class)
                ) : null, examId, userId);
        if (exam == null) {
            throw ApiException.notFound("考试不存在");
        }
        if (!"doing".equals(exam.get("status"))) {
            throw ApiException.badRequest("考试已提交，不能重复提交");
        }
        LocalDateTime startedAt = (LocalDateTime) exam.get("startedAt");
        LocalDateTime submittedAt = LocalDateTime.now();
        int usedSeconds = (int) Duration.between(startedAt, submittedAt).toSeconds();
        String status = usedSeconds > DURATION_SECONDS ? "timeout" : "submitted";
        Map<Long, String> answerMap = new HashMap<>();
        for (Requests.ExamAnswer answer : answers) {
            answerMap.put(answer.questionId(), answer.answer());
        }
        List<QuestionMapper.Question> questions = jdbc.query("""
                select q.* from exam_session_questions esq join questions q on q.id = esq.question_id
                where esq.exam_session_id = ?
                order by esq.question_order asc
                """, QUESTION_ROW_MAPPER, examId);
        int score = 0;
        for (QuestionMapper.Question q : questions) {
            String rawAnswer = answerMap.get(q.id());
            String userAnswer = rawAnswer == null || rawAnswer.isBlank() ? "" : questionService.normalizeAnswer(q.type(), rawAnswer);
            boolean correct = q.answer().equalsIgnoreCase(userAnswer);
            if (correct) {
                score++;
            }
            jdbc.update("update exam_session_questions set user_answer = ?, is_correct = ? where exam_session_id = ? and question_id = ?",
                    userAnswer, correct ? 1 : 0, examId, q.id());
            upsertRecord(userId, q.id(), userAnswer, correct);
        }
        jdbc.update("update exam_sessions set status = ?, score = ?, submitted_at = ?, used_seconds = ? where id = ?",
                status, score, submittedAt, Math.min(usedSeconds, DURATION_SECONDS), examId);
        List<Map<String, Object>> details = jdbc.queryForList("""
                select q.id questionId, esq.is_correct correct, q.answer correctAnswer, q.analysis analysis
                from exam_session_questions esq join questions q on q.id = esq.question_id
                where esq.exam_session_id = ?
                order by esq.question_order asc
                """, examId);
        return Map.of(
                "examId", examId,
                "score", score,
                "totalScore", 100,
                "usedSeconds", Math.min(usedSeconds, DURATION_SECONDS),
                "durationSeconds", DURATION_SECONDS,
                "submittedAt", submittedAt,
                "details", details
        );
    }

    public Map<String, Object> history(long userId, long levelId, int page, int pageSize) {
        int offset = (Math.max(page, 1) - 1) * pageSize;
        List<Map<String, Object>> items = jdbc.queryForList("""
                select id examId, status, score, total_score totalScore, used_seconds usedSeconds, started_at startedAt, submitted_at submittedAt
                from exam_sessions
                where user_id = ? and level_id = ?
                order by started_at desc
                limit ? offset ?
                """, userId, levelId, pageSize, offset);
        Integer total = jdbc.queryForObject("select count(*) from exam_sessions where user_id = ? and level_id = ?",
                Integer.class, userId, levelId);
        return Map.of("items", items, "page", page, "pageSize", pageSize, "total", total == null ? 0 : total);
    }

    private List<QuestionMapper.Question> randomQuestions(long levelId, String type, int limit) {
        return jdbc.query("""
                select * from questions where level_id = ? and type = ? and enabled = 1 order by rand() limit ?
                """, QUESTION_ROW_MAPPER, levelId, type, limit);
    }

    private List<QuestionMapper.PublicQuestion> loadExamQuestions(long examId) {
        return jdbc.query("""
                select q.*, esq.question_order from exam_session_questions esq join questions q on q.id = esq.question_id
                where esq.exam_session_id = ?
                order by esq.question_order asc
                """, (rs, rowNum) -> QuestionMapper.publicQuestion(QUESTION_ROW_MAPPER.mapRow(rs, rowNum), rs.getInt("question_order")), examId);
    }

    private void upsertRecord(long userId, long questionId, String answer, boolean correct) {
        jdbc.update("""
                insert into user_question_records(user_id, question_id, last_answer, is_correct, wrong_count, correct_count, last_answered_at)
                values (?, ?, ?, ?, ?, ?, now())
                on duplicate key update
                  last_answer = values(last_answer),
                  is_correct = values(is_correct),
                  wrong_count = wrong_count + if(values(is_correct) = 0, 1, 0),
                  correct_count = correct_count + if(values(is_correct) = 1, 1, 0),
                  last_answered_at = now()
                """, userId, questionId, answer, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0);
    }
}
