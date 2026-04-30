-- Notifications Table for Real-Time Notification System
-- This table stores all notifications for users

USE ctf_platform;

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT 'User who receives the notification',
    from_user_id INT NULL COMMENT 'User who triggered the notification (NULL for system notifications)',
    type VARCHAR(50) NOT NULL COMMENT 'Type: like, comment, reply, message, update, role_request, etc.',
    title VARCHAR(255) NOT NULL COMMENT 'Notification title',
    message TEXT NOT NULL COMMENT 'Notification message/content',
    link VARCHAR(500) NULL COMMENT 'Optional link to related content (e.g., /comments, /profile)',
    is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = unread, 1 = read',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_user_read (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for faster queries
CREATE INDEX idx_user_created ON notifications(user_id, created_at DESC);


