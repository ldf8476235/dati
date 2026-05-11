package com.dati.backend.service;

import com.dati.backend.auth.JwtService;
import com.dati.backend.common.ApiException;
import com.dati.backend.dto.Requests;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AdminService {
    private static final Pattern CHOICE_PATTERN = Pattern.compile("^(.*?)[（(]([ABCD])\\s*[）)]\\s*A[.．、]?(.*?)\\s*B[.．、]?(.*?)\\s*C[.．、]?(.*?)\\s*D[.．、]?(.*)$");
    private static final Pattern JUDGE_PATTERN = Pattern.compile("^[（(]([√×对错])\\s*[）)]\\s*(.*)$");

    private final JdbcTemplate jdbc;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminService(JdbcTemplate jdbc, JwtService jwtService) {
        this.jdbc = jdbc;
        this.jwtService = jwtService;
    }

    public Map<String, Object> login(String username, String password) {
        Map<String, Object> admin = jdbc.query("select id, password_hash, role from admins where username = ?",
                rs -> rs.next() ? Map.of("id", rs.getLong("id"), "hash", rs.getString("password_hash"), "role", rs.getString("role")) : null,
                username);
        if (admin == null || !passwordEncoder.matches(password, String.valueOf(admin.get("hash")))) {
            throw ApiException.unauthorized("账号或密码错误");
        }
        String token = jwtService.createToken((Long) admin.get("id"), String.valueOf(admin.get("role")), true);
        return Map.of("token", token);
    }

    public Map<String, Object> listQuestions(Long levelId, String type, String keyword, int page, int pageSize) {
        String like = "%" + (keyword == null ? "" : keyword.trim()) + "%";
        int offset = (Math.max(page, 1) - 1) * pageSize;
        List<Map<String, Object>> items = jdbc.queryForList("""
                select q.*, l.name levelName from questions q join question_levels l on l.id = q.level_id
                where (? is null or q.level_id = ?) and (? is null or q.type = ?) and (? = '%%' or q.content like ?)
                order by q.id desc
                limit ? offset ?
                """, levelId, levelId, emptyToNull(type), emptyToNull(type), like, like, pageSize, offset);
        Integer total = jdbc.queryForObject("""
                select count(*) from questions q
                where (? is null or q.level_id = ?) and (? is null or q.type = ?) and (? = '%%' or q.content like ?)
                """, Integer.class, levelId, levelId, emptyToNull(type), emptyToNull(type), like, like);
        return Map.of("items", items, "page", page, "pageSize", pageSize, "total", total == null ? 0 : total);
    }

    public Map<String, Object> createQuestion(Requests.AdminQuestion request) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> questionStatement(con.prepareStatement("""
                insert into questions(level_id, type, content, option_a, option_b, option_c, option_d, answer, analysis, sort_no, enabled)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS), request), keyHolder);
        return Map.of("id", keyHolder.getKey().longValue());
    }

    public Map<String, Object> updateQuestion(long id, Requests.AdminQuestion request) {
        int updated = jdbc.update(con -> questionStatement(con.prepareStatement("""
                update questions set level_id = ?, type = ?, content = ?, option_a = ?, option_b = ?, option_c = ?,
                option_d = ?, answer = ?, analysis = ?, sort_no = ?, enabled = ? where id = ?
                """), request, id));
        if (updated == 0) {
            throw ApiException.notFound("题目不存在");
        }
        return Map.of("id", id);
    }

    public Map<String, Object> disableQuestion(long id) {
        int updated = jdbc.update("update questions set enabled = 0 where id = ?", id);
        if (updated == 0) {
            throw ApiException.notFound("题目不存在");
        }
        return Map.of("id", id, "enabled", false);
    }

    @Transactional
    public Map<String, Object> importQuestions(long levelId, MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        try {
            List<ImportQuestion> rows;
            if (filename.endsWith(".docx")) {
                rows = parseDocx(levelId, file);
            } else if (filename.endsWith(".csv")) {
                rows = parseCsv(levelId, file);
            } else if (filename.endsWith(".doc")) {
                throw ApiException.badRequest("老式 .doc 请先用 Word/WPS 另存为 .docx 后再导入");
            } else {
                throw ApiException.badRequest("仅支持 .docx 和 .csv 导入");
            }
            int failed = 0;
            List<String> errors = new ArrayList<>();
            for (ImportQuestion row : rows) {
                if (row.error() != null) {
                    failed++;
                    errors.add(row.error());
                    continue;
                }
                insertImport(row);
            }
            return Map.of("imported", rows.size() - failed, "failed", failed, "errors", errors);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.badRequest("导入失败: " + ex.getMessage());
        }
    }

    private List<ImportQuestion> parseDocx(long levelId, MultipartFile file) throws Exception {
        List<ImportQuestion> rows = new ArrayList<>();
        String currentType = null;
        int sortNo = nextSortNo(levelId);
        try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
            int lineNo = 0;
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                lineNo++;
                String text = paragraph.getText() == null ? "" : paragraph.getText().trim();
                if (text.isBlank()) {
                    continue;
                }
                if (text.contains("选择题")) {
                    currentType = "single_choice";
                    continue;
                }
                if (text.contains("判断题")) {
                    currentType = "true_false";
                    continue;
                }
                if (currentType == null) {
                    continue;
                }
                try {
                    rows.add("single_choice".equals(currentType)
                            ? parseChoiceLine(levelId, text, sortNo++, lineNo)
                            : parseJudgeLine(levelId, text, sortNo++, lineNo));
                } catch (ApiException ex) {
                    rows.add(ImportQuestion.error(ex.getMessage()));
                }
            }
        }
        return rows;
    }

    private ImportQuestion parseChoiceLine(long levelId, String text, int sortNo, int lineNo) {
        Matcher matcher = CHOICE_PATTERN.matcher(text.replaceAll("\\s+", " "));
        if (!matcher.matches()) {
            throw ApiException.badRequest("第 " + lineNo + " 行选择题格式无法识别");
        }
        return new ImportQuestion(levelId, "single_choice", matcher.group(1).trim(), matcher.group(3).trim(),
                matcher.group(4).trim(), matcher.group(5).trim(), matcher.group(6).trim(), matcher.group(2), "", sortNo);
    }

    private ImportQuestion parseJudgeLine(long levelId, String text, int sortNo, int lineNo) {
        Matcher matcher = JUDGE_PATTERN.matcher(text);
        if (!matcher.matches()) {
            throw ApiException.badRequest("第 " + lineNo + " 行判断题格式无法识别");
        }
        String answer = List.of("√", "对").contains(matcher.group(1)) ? "true" : "false";
        return new ImportQuestion(levelId, "true_false", matcher.group(2).trim(), null, null, null, null, answer, "", sortNo);
    }

    private List<ImportQuestion> parseCsv(long defaultLevelId, MultipartFile file) throws Exception {
        List<ImportQuestion> rows = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build().parse(reader)) {
            int sortNo = nextSortNo(defaultLevelId);
            for (CSVRecord record : parser) {
                long levelId = record.isMapped("levelId") && !record.get("levelId").isBlank()
                        ? Long.parseLong(record.get("levelId")) : defaultLevelId;
                String rawType = get(record, "题型", "type");
                String type = rawType.contains("判断") || rawType.equals("true_false") ? "true_false" : "single_choice";
                String answer = get(record, "答案", "answer");
                if ("true_false".equals(type)) {
                    answer = List.of("正确", "true", "√", "对").contains(answer) ? "true" : "false";
                } else {
                    answer = answer.toUpperCase(Locale.ROOT);
                }
                rows.add(new ImportQuestion(levelId, type, get(record, "题干", "content"),
                        getNullable(record, "A", "optionA"), getNullable(record, "B", "optionB"),
                        getNullable(record, "C", "optionC"), getNullable(record, "D", "optionD"),
                        answer, getNullable(record, "解析", "analysis"), parseInt(getNullable(record, "排序", "sortNo"), sortNo++)));
            }
        }
        return rows;
    }

    private void insertImport(ImportQuestion row) {
        jdbc.update("""
                insert into questions(level_id, type, content, option_a, option_b, option_c, option_d, answer, analysis, sort_no, enabled)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """, row.levelId(), row.type(), row.content(), row.optionA(), row.optionB(), row.optionC(), row.optionD(),
                row.answer(), row.analysis(), row.sortNo());
    }

    private PreparedStatement questionStatement(PreparedStatement ps, Requests.AdminQuestion request, Object... tail) throws java.sql.SQLException {
        ps.setLong(1, request.levelId());
        ps.setString(2, request.type());
        ps.setString(3, request.content());
        ps.setString(4, request.optionA());
        ps.setString(5, request.optionB());
        ps.setString(6, request.optionC());
        ps.setString(7, request.optionD());
        ps.setString(8, request.answer());
        ps.setString(9, request.analysis());
        ps.setInt(10, request.sortNo() == null ? 0 : request.sortNo());
        ps.setInt(11, Boolean.FALSE.equals(request.enabled()) ? 0 : 1);
        if (tail.length > 0) {
            ps.setObject(12, tail[0]);
        }
        return ps;
    }

    private int nextSortNo(long levelId) {
        Integer max = jdbc.queryForObject("select coalesce(max(sort_no), 0) from questions where level_id = ?", Integer.class, levelId);
        return (max == null ? 0 : max) + 1;
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String get(CSVRecord record, String cn, String en) {
        String value = getNullable(record, cn, en);
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("CSV 第 " + record.getRecordNumber() + " 行缺少字段 " + cn);
        }
        return value.trim();
    }

    private String getNullable(CSVRecord record, String cn, String en) {
        if (record.isMapped(cn)) return record.get(cn);
        if (record.isMapped(en)) return record.get(en);
        return null;
    }

    private int parseInt(String value, int fallback) {
        if (value == null || value.isBlank()) return fallback;
        return Integer.parseInt(value.trim());
    }

    private record ImportQuestion(long levelId, String type, String content, String optionA, String optionB,
                                  String optionC, String optionD, String answer, String analysis, int sortNo,
                                  String error) {
        private ImportQuestion(long levelId, String type, String content, String optionA, String optionB,
                               String optionC, String optionD, String answer, String analysis, int sortNo) {
            this(levelId, type, content, optionA, optionB, optionC, optionD, answer, analysis, sortNo, null);
        }

        private static ImportQuestion error(String error) {
            return new ImportQuestion(0, "", "", null, null, null, null, "", "", 0, error);
        }
    }
}
