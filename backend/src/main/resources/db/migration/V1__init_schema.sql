CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL UNIQUE,
  unionid VARCHAR(64) NULL,
  nickname VARCHAR(100) NULL,
  avatar_url VARCHAR(500) NULL,
  phone VARCHAR(30) NULL,
  has_paid TINYINT NOT NULL DEFAULT 0,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE question_levels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  stage VARCHAR(20) NOT NULL,
  stage_name VARCHAR(20) NOT NULL,
  level_no INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  sort_order INT NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  UNIQUE KEY uk_stage_level(stage, level_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  level_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  option_a TEXT NULL,
  option_b TEXT NULL,
  option_c TEXT NULL,
  option_d TEXT NULL,
  answer VARCHAR(20) NOT NULL,
  analysis TEXT NULL,
  sort_no INT NOT NULL DEFAULT 0,
  enabled TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_questions_level_type_sort(level_id, type, sort_no),
  FULLTEXT KEY idx_questions_content(content, analysis),
  CONSTRAINT fk_questions_level FOREIGN KEY (level_id) REFERENCES question_levels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_question_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  last_answer VARCHAR(20) NULL,
  is_correct TINYINT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  last_answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_question(user_id, question_id),
  KEY idx_user_wrong(user_id, wrong_count, last_answered_at),
  CONSTRAINT fk_uqr_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_uqr_question FOREIGN KEY (question_id) REFERENCES questions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_practice_progress (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  level_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  last_question_id BIGINT NULL,
  answered_count INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_level_type(user_id, level_id, type),
  CONSTRAINT fk_upp_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_upp_level FOREIGN KEY (level_id) REFERENCES question_levels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE exam_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  level_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'doing',
  total_score INT NOT NULL DEFAULT 100,
  score INT NOT NULL DEFAULT 0,
  choice_count INT NOT NULL DEFAULT 80,
  judge_count INT NOT NULL DEFAULT 20,
  duration_seconds INT NOT NULL DEFAULT 3600,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  used_seconds INT NULL,
  KEY idx_exam_user_started(user_id, started_at),
  CONSTRAINT fk_exam_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_exam_level FOREIGN KEY (level_id) REFERENCES question_levels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE exam_session_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_session_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  question_order INT NOT NULL,
  user_answer VARCHAR(20) NULL,
  is_correct TINYINT NULL,
  score INT NOT NULL DEFAULT 1,
  UNIQUE KEY uk_exam_question(exam_session_id, question_id),
  UNIQUE KEY uk_exam_order(exam_session_id, question_order),
  CONSTRAINT fk_esq_exam FOREIGN KEY (exam_session_id) REFERENCES exam_sessions(id),
  CONSTRAINT fk_esq_question FOREIGN KEY (question_id) REFERENCES questions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  wechat_transaction_id VARCHAR(64) NULL,
  amount INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_orders_user(user_id, created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admins (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
