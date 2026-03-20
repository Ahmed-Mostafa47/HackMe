-- ctf_platform.sql
-- Database schema for ctf_platform (modified: important fields NOT NULL, added email_verifications)

CREATE DATABASE IF NOT EXISTS ctf_platform
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE ctf_platform;

-- ====================================================
-- Tables (InnoDB, utf8mb4). Assumes MySQL 5.7+ for JSON.
-- ====================================================

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  profile_meta JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  permission_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_types (
  labtype_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_by INT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE labs (
  lab_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  solution LONGTEXT NULL,
  icon VARCHAR(16) NULL,
  port INT NULL,
  launch_path VARCHAR(255) NULL,
  labtype_id INT NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  points_total INT NOT NULL DEFAULT 0,
  created_by INT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  visibility ENUM('public','private','unlisted') NOT NULL DEFAULT 'private',
  docker_image VARCHAR(255) NOT NULL,
  reset_interval INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE challenges (
  challenge_id INT PRIMARY KEY AUTO_INCREMENT,
  lab_id INT NOT NULL,
  created_by INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  statement TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  whitebox_files_ref JSON NULL,
  time_limit INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE testcases (
  testcase_id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_id INT NOT NULL,
  secret_flag_hash VARCHAR(255) NOT NULL,
  secret_flag_plain TEXT NULL,
  points INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  type ENUM('flag_match','http_response_check','script_run') NOT NULL DEFAULT 'flag_match',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hints (
  hint_id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_id INT NOT NULL,
  text TEXT NOT NULL,
  penalty_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_resource_usage (
  usage_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  lab_id INT NOT NULL,
  hint_viewed TINYINT(1) NOT NULL DEFAULT 0,
  solution_viewed TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_lab (user_id, lab_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE file_resources (
  file_id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT NOT NULL,
  lab_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  checksum VARCHAR(128) NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  access_level ENUM('public','private','restricted') NOT NULL DEFAULT 'private'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_instances (
  instance_id INT PRIMARY KEY AUTO_INCREMENT,
  lab_id INT NOT NULL,
  user_id INT NOT NULL,
  container_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL DEFAULT NULL,
  status ENUM('running','stopped','crashed','expired') NOT NULL DEFAULT 'running',
  resources JSON NULL,
  dynamic_flag VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE submissions (
  submission_id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL,
  user_id INT NOT NULL,
  challenge_id INT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type ENUM('flag','report','poc','exploit') NOT NULL DEFAULT 'flag',
  payload_text TEXT NULL,
  content_url VARCHAR(1024) NULL,
  auto_score INT NULL,
  manual_score INT NULL,
  final_score INT NULL,
  status ENUM('pending','graded','rejected','needs_review') NOT NULL DEFAULT 'pending',
  reviewer_id INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE submission_files (
  submission_id INT NOT NULL,
  file_id INT NOT NULL,
  PRIMARY KEY (submission_id, file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE findings (
  finding_id INT PRIMARY KEY AUTO_INCREMENT,
  submission_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  vuln_type VARCHAR(100) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'low',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  description TEXT NULL,
  evidence TEXT NULL,
  score_adjustment INT NOT NULL DEFAULT 0,
  poc TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Challenges_comments (
  comment_id INT PRIMARY KEY AUTO_INCREMENT,
  submission_id INT NOT NULL,
  challenge_id INT NOT NULL,
  user_id INT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comment_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_comment_like (comment_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leaderboard (
  user_id INT PRIMARY KEY,
  total_points INT NOT NULL DEFAULT 0,
  last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(200) NOT NULL,
  target_type VARCHAR(100) NULL,
  target_id INT NULL,
  ip_address VARCHAR(45) NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  challenge_id INT NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadata JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE blocks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  ip_address VARCHAR(45) NULL,
  challenge_id INT NOT NULL,
  reason VARCHAR(255) NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================
-- Table for email verification (OTP)
-- ====================================================
CREATE TABLE email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================
-- Table for role requests (admin/instructor promotion)
-- ====================================================
CREATE TABLE role_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  requested_role VARCHAR(50) NOT NULL,
  comment TEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================
-- Foreign keys (added after tables creation to avoid order issues)
-- ====================================================

ALTER TABLE role_permissions 
  ADD CONSTRAINT fk_roleperm_role FOREIGN KEY (role_id) REFERENCES roles (role_id),
  ADD CONSTRAINT fk_roleperm_perm FOREIGN KEY (permission_id) REFERENCES permissions (permission_id);

ALTER TABLE user_roles 
  ADD CONSTRAINT fk_userroles_user FOREIGN KEY (user_id) REFERENCES users (user_id),
  ADD CONSTRAINT fk_userroles_role FOREIGN KEY (role_id) REFERENCES roles (role_id),
  ADD CONSTRAINT fk_userroles_assignedby FOREIGN KEY (assigned_by) REFERENCES users (user_id);

ALTER TABLE labs 
  ADD CONSTRAINT fk_labs_labtype FOREIGN KEY (labtype_id) REFERENCES lab_types (labtype_id),
  ADD CONSTRAINT fk_labs_createdby FOREIGN KEY (created_by) REFERENCES users (user_id);

ALTER TABLE challenges 
  ADD CONSTRAINT fk_challenges_lab FOREIGN KEY (lab_id) REFERENCES labs (lab_id),
  ADD CONSTRAINT fk_challenges_createdby FOREIGN KEY (created_by) REFERENCES users (user_id);

ALTER TABLE testcases 
  ADD CONSTRAINT fk_testcases_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id);

ALTER TABLE hints 
  ADD CONSTRAINT fk_hints_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id);

ALTER TABLE lab_resource_usage
  ADD CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_usage_lab FOREIGN KEY (lab_id) REFERENCES labs (lab_id) ON DELETE CASCADE;

ALTER TABLE file_resources 
  ADD CONSTRAINT fk_files_owner FOREIGN KEY (owner_id) REFERENCES users (user_id),
  ADD CONSTRAINT fk_files_lab FOREIGN KEY (lab_id) REFERENCES labs (lab_id);

ALTER TABLE lab_instances 
  ADD CONSTRAINT fk_instances_lab FOREIGN KEY (lab_id) REFERENCES labs (lab_id),
  ADD CONSTRAINT fk_instances_user FOREIGN KEY (user_id) REFERENCES users (user_id);

ALTER TABLE submissions 
  ADD CONSTRAINT fk_submissions_instance FOREIGN KEY (instance_id) REFERENCES lab_instances (instance_id),
  ADD CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users (user_id),
  ADD CONSTRAINT fk_submissions_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id),
  ADD CONSTRAINT fk_submissions_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (user_id);

ALTER TABLE submission_files 
  ADD CONSTRAINT fk_subfiles_submission FOREIGN KEY (submission_id) REFERENCES submissions (submission_id),
  ADD CONSTRAINT fk_subfiles_file FOREIGN KEY (file_id) REFERENCES file_resources (file_id);

ALTER TABLE findings 
  ADD CONSTRAINT fk_findings_submission FOREIGN KEY (submission_id) REFERENCES submissions (submission_id),
  ADD CONSTRAINT fk_findings_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (user_id);

ALTER TABLE Challenges_comments 
  ADD CONSTRAINT fk_chalenges_comments_submission FOREIGN KEY (submission_id) REFERENCES submissions (submission_id),
  ADD CONSTRAINT fk_chalenges_comments_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id),
  ADD CONSTRAINT fk_chalenges_comments_user FOREIGN KEY (user_id) REFERENCES users (user_id);

ALTER TABLE comments 
  ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE;

ALTER TABLE comment_likes 
  ADD CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE;

ALTER TABLE role_requests 
  ADD CONSTRAINT fk_role_requests_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE;

ALTER TABLE leaderboard 
  ADD CONSTRAINT fk_leaderboard_user FOREIGN KEY (user_id) REFERENCES users (user_id);

ALTER TABLE audit_logs 
  ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id);

ALTER TABLE attempt_logs 
  ADD CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users (user_id),
  ADD CONSTRAINT fk_attempts_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id);

ALTER TABLE blocks 
  ADD CONSTRAINT fk_blocks_user FOREIGN KEY (user_id) REFERENCES users (user_id),
  ADD CONSTRAINT fk_blocks_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (challenge_id);
