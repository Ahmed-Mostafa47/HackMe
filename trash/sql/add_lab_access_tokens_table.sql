-- Lab access tokens: one-time tokens to allow lab sandbox access only via Start Lab button
-- Run: mysql -u user -p ctf_platform < add_lab_access_tokens_table.sql
USE ctf_platform;

CREATE TABLE IF NOT EXISTS lab_access_tokens (
  token VARCHAR(64) PRIMARY KEY,
  lab_id INT NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_lab_expires (lab_id, expires_at),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
