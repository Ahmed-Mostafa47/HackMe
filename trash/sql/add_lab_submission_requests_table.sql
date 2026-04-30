-- Instructor lab proposals pending admin review (also created at runtime by submit_lab_proposal.php if missing)
USE ctf_platform;

CREATE TABLE IF NOT EXISTS lab_submission_requests (
    submission_id INT NOT NULL AUTO_INCREMENT,
    submitted_by_user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    labtype_id TINYINT NOT NULL DEFAULT 1 COMMENT '1=white box, 2=black box',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
    points_total INT NOT NULL DEFAULT 0,
    owasp_category VARCHAR(80) NOT NULL DEFAULT '',
    hints TEXT NULL,
    solution TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (submission_id),
    KEY idx_lab_sub_status (status),
    KEY idx_lab_sub_user (submitted_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
