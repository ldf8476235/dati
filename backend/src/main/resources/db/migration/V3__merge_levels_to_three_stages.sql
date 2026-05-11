CREATE TEMPORARY TABLE tmp_practice_progress AS
SELECT
  upp.user_id,
  CASE ql.stage
    WHEN 'junior' THEN 1
    WHEN 'middle' THEN 2
    WHEN 'senior' THEN 3
  END AS level_id,
  upp.type,
  MAX(upp.last_question_id) AS last_question_id,
  SUM(upp.answered_count) AS answered_count,
  MAX(upp.updated_at) AS updated_at
FROM user_practice_progress upp
JOIN question_levels ql ON ql.id = upp.level_id
WHERE ql.stage IN ('junior', 'middle', 'senior')
GROUP BY upp.user_id, ql.stage, upp.type;

DELETE FROM user_practice_progress;

INSERT INTO user_practice_progress(user_id, level_id, type, last_question_id, answered_count, updated_at)
SELECT user_id, level_id, type, last_question_id, answered_count, updated_at
FROM tmp_practice_progress;

DROP TEMPORARY TABLE tmp_practice_progress;

UPDATE questions q
JOIN question_levels ql ON ql.id = q.level_id
SET q.level_id = CASE ql.stage
  WHEN 'junior' THEN 1
  WHEN 'middle' THEN 2
  WHEN 'senior' THEN 3
END
WHERE ql.stage IN ('junior', 'middle', 'senior');

UPDATE exam_sessions e
JOIN question_levels ql ON ql.id = e.level_id
SET e.level_id = CASE ql.stage
  WHEN 'junior' THEN 1
  WHEN 'middle' THEN 2
  WHEN 'senior' THEN 3
END
WHERE ql.stage IN ('junior', 'middle', 'senior');

DELETE FROM question_levels WHERE id NOT IN (1, 2, 3);

UPDATE question_levels
SET stage = 'junior', stage_name = '初级', level_no = 1, name = '初级', sort_order = 10, enabled = 1
WHERE id = 1;

UPDATE question_levels
SET stage = 'middle', stage_name = '中级', level_no = 1, name = '中级', sort_order = 20, enabled = 1
WHERE id = 2;

UPDATE question_levels
SET stage = 'senior', stage_name = '高级', level_no = 1, name = '高级', sort_order = 30, enabled = 1
WHERE id = 3;
