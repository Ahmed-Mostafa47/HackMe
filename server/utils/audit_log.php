<?php
declare(strict_types=1);

/**
 * Ensure audit_logs table exists.
 */
function hackme_ensure_audit_logs_table(PdoMysqliShim $conn): void
{
    $pdo = $conn->getPdo();
    $sql = "
        CREATE TABLE IF NOT EXISTS audit_logs (
            log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            actor_user_id INT NULL,
            actor_username VARCHAR(100) NULL,
            action VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            target_user_id INT NULL,
            target_username VARCHAR(100) NULL,
            details TEXT NULL,
            ip_address VARCHAR(64) NULL,
            user_agent VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_actor_user_id (actor_user_id),
            INDEX idx_action (action),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    $pdo->exec($sql);

    // Backward-compatible migrations for old audit_logs schema.
    $columns = [];
    $colRes = $pdo->query("SHOW COLUMNS FROM audit_logs");
    if ($colRes instanceof PDOStatement) {
        while ($row = $colRes->fetch(PDO::FETCH_ASSOC)) {
            $name = (string)($row['Field'] ?? '');
            if ($name !== '') {
                $columns[$name] = true;
            }
        }
    }

    if (!isset($columns['actor_user_id'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN actor_user_id INT NULL");
    }
    if (!isset($columns['actor_username'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN actor_username VARCHAR(100) NULL");
    }
    if (!isset($columns['action'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN action VARCHAR(100) NOT NULL DEFAULT 'unknown'");
    }
    if (!isset($columns['status'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'success'");
    }
    if (!isset($columns['target_user_id'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN target_user_id INT NULL");
    }
    if (!isset($columns['target_username'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN target_username VARCHAR(100) NULL");
    }
    if (!isset($columns['details'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN details TEXT NULL");
    }
    if (!isset($columns['ip_address'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(64) NULL");
    }
    if (!isset($columns['user_agent'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN user_agent VARCHAR(255) NULL");
    }
    if (!isset($columns['created_at'])) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }
}

/**
 * Insert one audit log row.
 */
function hackme_write_audit_log(PdoMysqliShim $conn, array $payload): bool
{
    $pdo = $conn->getPdo();
    hackme_ensure_audit_logs_table($conn);

    $actorUserId = isset($payload['actor_user_id']) ? (int)$payload['actor_user_id'] : null;
    $actorUsername = isset($payload['actor_username']) ? (string)$payload['actor_username'] : null;
    $action = isset($payload['action']) ? trim((string)$payload['action']) : '';
    $status = isset($payload['status']) ? strtolower(trim((string)$payload['status'])) : 'success';
    $targetUserId = isset($payload['target_user_id']) ? (int)$payload['target_user_id'] : null;
    $targetUsername = isset($payload['target_username']) ? (string)$payload['target_username'] : null;
    $details = isset($payload['details']) ? (string)$payload['details'] : null;
    $ipAddress = isset($payload['ip_address']) ? (string)$payload['ip_address'] : '';
    $clientLocalIp = isset($payload['client_local_ip']) ? trim((string)$payload['client_local_ip']) : '';
    $userAgent = isset($payload['user_agent']) ? (string)$payload['user_agent'] : null;
    $headerClientTimeUtc = trim((string)($_SERVER['HTTP_X_HACKME_CLIENT_TIME_UTC'] ?? ''));
    $headerClientTimezone = trim((string)($_SERVER['HTTP_X_HACKME_CLIENT_TIMEZONE'] ?? ''));
    $headerClientTzOffsetRaw = isset($_SERVER['HTTP_X_HACKME_CLIENT_TZ_OFFSET_MINUTES']) ? trim((string)$_SERVER['HTTP_X_HACKME_CLIENT_TZ_OFFSET_MINUTES']) : '';
    $headerClientLocalIp = trim((string)($_SERVER['HTTP_X_HACKME_CLIENT_LOCAL_IP'] ?? ''));

    if ($action === '') {
        return false;
    }
    if (!in_array($status, ['success', 'failed'], true)) {
        $status = 'success';
    }

    // Keep values within schema limits to avoid insert failures.
    $action = substr($action, 0, 100);
    $status = substr($status, 0, 20);
    $actorUsername = $actorUsername !== null ? substr($actorUsername, 0, 100) : null;
    $targetUsername = $targetUsername !== null ? substr($targetUsername, 0, 100) : null;
    if ($ipAddress === '') {
        $ipAddress = hackme_client_ip();
    }
    if ($clientLocalIp === '' && $headerClientLocalIp !== '') {
        $clientLocalIp = $headerClientLocalIp;
    }
    // Prefer client-provided LAN IP when server only sees loopback (::1/127.0.0.1).
    if ($clientLocalIp !== '' && filter_var($clientLocalIp, FILTER_VALIDATE_IP)) {
        $serverSeenLoopback = in_array((string)$ipAddress, ['127.0.0.1', '::1', 'localhost', ''], true);
        if ($serverSeenLoopback) {
            $ipAddress = $clientLocalIp;
        }
    }
    $ipAddress = $ipAddress !== null ? substr($ipAddress, 0, 45) : null;
    $userAgent = $userAgent !== null ? substr($userAgent, 0, 255) : null;

    // Legacy table enforces CHECK(json_valid(details)).
    $detailsObj = [];
    if ($details !== null && trim($details) !== '') {
        $trimmed = trim($details);
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $detailsObj = $decoded;
        } else {
            $detailsObj = ['message' => $trimmed];
        }
    }
    $resolvedClientTimeUtc = trim((string)($payload['client_time_utc'] ?? $detailsObj['client_time_utc'] ?? $headerClientTimeUtc));
    $resolvedClientTimezone = trim((string)($payload['client_timezone'] ?? $detailsObj['client_timezone'] ?? $headerClientTimezone));
    $resolvedClientTzOffset = $payload['client_tz_offset_minutes'] ?? $detailsObj['client_tz_offset_minutes'] ?? null;
    if ($resolvedClientTzOffset === null && $headerClientTzOffsetRaw !== '' && is_numeric($headerClientTzOffsetRaw)) {
        $resolvedClientTzOffset = (int)$headerClientTzOffsetRaw;
    } elseif ($resolvedClientTzOffset !== null) {
        $resolvedClientTzOffset = (int)$resolvedClientTzOffset;
    }
    if ($resolvedClientTimeUtc === '') {
        $resolvedClientTimeUtc = gmdate('Y-m-d\TH:i:s\Z');
    }
    if (!isset($detailsObj['client_time_utc'])) {
        $detailsObj['client_time_utc'] = $resolvedClientTimeUtc;
    }
    if (!isset($detailsObj['client_timezone']) && $resolvedClientTimezone !== '') {
        $detailsObj['client_timezone'] = $resolvedClientTimezone;
    }
    if (!isset($detailsObj['client_tz_offset_minutes']) && $resolvedClientTzOffset !== null) {
        $detailsObj['client_tz_offset_minutes'] = $resolvedClientTzOffset;
    }
    $detailsJson = json_encode($detailsObj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';

    // Legacy compatibility: some schemas require a non-null user_id column.
    // Use 0 fallback so security events for unknown/unauthenticated actors are still persisted.
    $legacyUserId = $actorUserId ?? $targetUserId ?? 0;

    $hasUserIdColumn = false;
    $colStmt = $pdo->query("SHOW COLUMNS FROM audit_logs LIKE 'user_id'");
    $hasUserIdColumn = ($colStmt instanceof PDOStatement) && ($colStmt->fetch(PDO::FETCH_ASSOC) !== false);

    if ($hasUserIdColumn) {
        $sql = "
            INSERT INTO audit_logs (
                user_id, actor_user_id, actor_username, action, status,
                target_user_id, target_username, details, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        $stmt = $pdo->prepare($sql);
    } else {
        $sql = "
            INSERT INTO audit_logs (
                actor_user_id, actor_username, action, status,
                target_user_id, target_username, details, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        $stmt = $pdo->prepare($sql);
    }
    if (!$stmt) {
        error_log('[HackMe AUDIT] prepare failed: ' . $conn->error);
        return false;
    }

    $params = $hasUserIdColumn
        ? [$legacyUserId, $actorUserId, $actorUsername, $action, $status, $targetUserId, $targetUsername, $detailsJson, $ipAddress, $userAgent]
        : [$actorUserId, $actorUsername, $action, $status, $targetUserId, $targetUsername, $detailsJson, $ipAddress, $userAgent];
    $ok = $stmt->execute($params);
    $stmtError = '';
    if (!$ok) {
        $err = $stmt->errorInfo();
        $stmtError = (string)($err[2] ?? '');
    }

    if (!$ok) {
        error_log('[HackMe AUDIT] execute failed for action=' . $action . ' err=' . $stmtError . ' conn=' . $conn->error);
    }

    return (bool)$ok;
}

function hackme_client_ip(): string
{
    $keys = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR',
    ];
    foreach ($keys as $k) {
        if (!empty($_SERVER[$k])) {
            $raw = (string)$_SERVER[$k];
            $parts = explode(',', $raw);
            $candidate = trim((string)$parts[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }
    }
    return '';
}
