-- Tracks comment moderation strikes and ban window on users (notifications table for warnings).

USE ctf_platform;

ALTER TABLE users
  ADD COLUMN comment_moderation_strikes INT NOT NULL DEFAULT 0
    COMMENT 'Count of blocked toxic comment attempts' AFTER last_login,
  ADD COLUMN comments_banned_until DATETIME NULL DEFAULT NULL
    COMMENT 'NULL = not banned; future = cannot post comments until then' AFTER comment_moderation_strikes;
