<?php
declare(strict_types=1);

require_once __DIR__ . '/pdo_mysqli_shim.php';

function hackme_ensure_security_tables(PdoMysqliShim $conn): void
{
    $conn->query("
        CREATE TABLE IF NOT EXISTS security_events (
            event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            ip_address VARCHAR(64) NULL,
            event_type VARCHAR(80) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_event_type_created (event_type, created_at),
            INDEX idx_user_created (user_id, created_at),
            INDEX idx_ip_created (ip_address, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS security_blocks (
            block_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            ip_address VARCHAR(64) NULL,
            reason VARCHAR(120) NOT NULL,
            blocked_until DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_block_until (blocked_until),
            INDEX idx_user_block (user_id, blocked_until),
            INDEX idx_ip_block (ip_address, blocked_until)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function hackme_is_blocked_now(PdoMysqliShim $conn, ?int $userId, string $ipAddress): array
{
    hackme_ensure_security_tables($conn);
    $uid = $userId !== null && $userId > 0 ? (int)$userId : 0;
    $ipEsc = $conn->real_escape_string($ipAddress);
    $sql = "
        SELECT blocked_until, reason
        FROM security_blocks
        WHERE blocked_until > NOW()
          AND (
            (user_id IS NOT NULL AND user_id = $uid)
            OR (ip_address IS NOT NULL AND ip_address = '$ipEsc')
          )
        ORDER BY blocked_until DESC
        LIMIT 1
    ";
    $res = $conn->query($sql);
    if ($res && $res->num_rows > 0) {
        $row = $res->fetch_assoc();
        return [
            'blocked' => true,
            'blocked_until' => (string)($row['blocked_until'] ?? ''),
            'reason' => (string)($row['reason'] ?? 'security_block'),
        ];
    }
    return ['blocked' => false, 'blocked_until' => '', 'reason' => ''];
}

function hackme_record_url_tamper_and_maybe_block(PdoMysqliShim $conn, ?int $userId, string $ipAddress): array
{
    hackme_ensure_security_tables($conn);
    $uidSql = ($userId !== null && $userId > 0) ? (string)((int)$userId) : 'NULL';
    $ipEsc = $conn->real_escape_string($ipAddress);
    $conn->query("INSERT INTO security_events (user_id, ip_address, event_type) VALUES ($uidSql, '$ipEsc', 'url_tamper_attempt')");

    $uid = $userId !== null && $userId > 0 ? (int)$userId : 0;
    $countSql = "
        SELECT COUNT(*) AS attempts
        FROM security_events
        WHERE event_type = 'url_tamper_attempt'
          AND created_at >= (NOW() - INTERVAL 1 MINUTE)
          AND (
            (user_id IS NOT NULL AND user_id = $uid)
            OR (ip_address IS NOT NULL AND ip_address = '$ipEsc')
          )
    ";
    $countRes = $conn->query($countSql);
    $attempts = 0;
    if ($countRes && $countRes->num_rows > 0) {
        $attempts = (int)($countRes->fetch_assoc()['attempts'] ?? 0);
    }

    if ($attempts >= 2) {
        $reasonEsc = $conn->real_escape_string('url_tamper_repeated');
        $conn->query("
            INSERT INTO security_blocks (user_id, ip_address, reason, blocked_until)
            VALUES ($uidSql, '$ipEsc', '$reasonEsc', DATE_ADD(NOW(), INTERVAL 1 MINUTE))
        ");
        return ['blocked' => true, 'attempts' => $attempts];
    }

    return ['blocked' => false, 'attempts' => $attempts];
}

function hackme_record_security_event(PdoMysqliShim $conn, string $eventType, ?int $userId, string $ipAddress): void
{
    hackme_ensure_security_tables($conn);
    $eventType = trim($eventType);
    if ($eventType === '') {
        return;
    }
    $uidSql = ($userId !== null && $userId > 0) ? (string)((int)$userId) : 'NULL';
    $ipEsc = $conn->real_escape_string($ipAddress);
    $typeEsc = $conn->real_escape_string($eventType);
    $conn->query("INSERT INTO security_events (user_id, ip_address, event_type) VALUES ($uidSql, '$ipEsc', '$typeEsc')");
}

function hackme_count_recent_security_events(PdoMysqliShim $conn, string $eventType, ?int $userId, string $ipAddress, int $windowSeconds = 60): int
{
    hackme_ensure_security_tables($conn);
    $eventType = trim($eventType);
    if ($eventType === '') {
        return 0;
    }
    $uid = $userId !== null && $userId > 0 ? (int)$userId : 0;
    $ipEsc = $conn->real_escape_string($ipAddress);
    $typeEsc = $conn->real_escape_string($eventType);
    $windowSeconds = max(10, $windowSeconds);
    $sql = "
        SELECT COUNT(*) AS attempts
        FROM security_events
        WHERE event_type = '$typeEsc'
          AND created_at >= DATE_SUB(NOW(), INTERVAL $windowSeconds SECOND)
          AND (
            (user_id IS NOT NULL AND user_id = $uid)
            OR (ip_address IS NOT NULL AND ip_address = '$ipEsc')
          )
    ";
    $res = $conn->query($sql);
    if (!$res || $res->num_rows === 0) {
        return 0;
    }
    return (int)($res->fetch_assoc()['attempts'] ?? 0);
}

function hackme_apply_temporary_block(PdoMysqliShim $conn, ?int $userId, string $ipAddress, string $reason, int $seconds = 60): array
{
    hackme_ensure_security_tables($conn);
    $uidSql = ($userId !== null && $userId > 0) ? (string)((int)$userId) : 'NULL';
    $ipEsc = $conn->real_escape_string($ipAddress);
    $reasonEsc = $conn->real_escape_string(trim($reason) !== '' ? $reason : 'security_block');
    $seconds = max(30, $seconds);

    $conn->query("
        INSERT INTO security_blocks (user_id, ip_address, reason, blocked_until)
        VALUES ($uidSql, '$ipEsc', '$reasonEsc', DATE_ADD(NOW(), INTERVAL $seconds SECOND))
    ");

    $rowRes = $conn->query("
        SELECT blocked_until
        FROM security_blocks
        WHERE reason = '$reasonEsc'
          AND (
            (user_id IS NOT NULL AND user_id = " . ($userId !== null && $userId > 0 ? (int)$userId : 0) . ")
            OR (ip_address IS NOT NULL AND ip_address = '$ipEsc')
          )
        ORDER BY block_id DESC
        LIMIT 1
    ");
    $blockedUntil = '';
    if ($rowRes && $rowRes->num_rows > 0) {
        $blockedUntil = (string)($rowRes->fetch_assoc()['blocked_until'] ?? '');
    }

    return [
        'blocked' => true,
        'reason' => trim($reason) !== '' ? $reason : 'security_block',
        'blocked_until' => $blockedUntil,
    ];
}

function hackme_record_event_and_maybe_block(
    PdoMysqliShim $conn,
    string $eventType,
    ?int $userId,
    string $ipAddress,
    int $threshold,
    string $blockReason,
    int $windowSeconds = 60,
    int $blockSeconds = 60
): array {
    hackme_record_security_event($conn, $eventType, $userId, $ipAddress);
    $attempts = hackme_count_recent_security_events($conn, $eventType, $userId, $ipAddress, $windowSeconds);
    if ($attempts >= max(1, $threshold)) {
        $block = hackme_apply_temporary_block($conn, $userId, $ipAddress, $blockReason, $blockSeconds);
        return [
            'blocked' => true,
            'attempts' => $attempts,
            'reason' => (string)($block['reason'] ?? $blockReason),
            'blocked_until' => (string)($block['blocked_until'] ?? ''),
        ];
    }
    return ['blocked' => false, 'attempts' => $attempts, 'reason' => '', 'blocked_until' => ''];
}
