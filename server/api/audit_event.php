<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/audit_log.php';
require_once __DIR__ . '/../utils/security_block.php';
require_once __DIR__ . '/../utils/security_alert.php';

function hackme_alert_ip(string $requestIp, string $clientLocalIp): string
{
    $requestIp = trim($requestIp);
    $clientLocalIp = trim($clientLocalIp);
    $isLoopback = in_array($requestIp, ['127.0.0.1', '::1', 'localhost', ''], true);
    if ($isLoopback && filter_var($clientLocalIp, FILTER_VALIDATE_IP)) {
        return $clientLocalIp;
    }
    return $requestIp !== '' ? $requestIp : ($clientLocalIp !== '' ? $clientLocalIp : 'unknown');
}

function hackme_recent_security_block_logged(
    PdoMysqliShim $conn,
    int $userId,
    string $ipAddress,
    string $reason,
    int $windowSeconds = 70
): bool {
    $uid = max(0, $userId);
    $ipEsc = $conn->real_escape_string($ipAddress);
    $reasonEsc = $conn->real_escape_string($reason);
    $windowSeconds = max(10, $windowSeconds);

    $sql = "
        SELECT 1
        FROM audit_logs
        WHERE action = 'security_block'
          AND created_at >= DATE_SUB(NOW(), INTERVAL {$windowSeconds} SECOND)
          AND (
            (actor_user_id IS NOT NULL AND actor_user_id = {$uid})
            OR (ip_address IS NOT NULL AND ip_address = '{$ipEsc}')
          )
          AND details LIKE '%\"block_reason\":\"{$reasonEsc}\"%'
        LIMIT 1
    ";
    $res = $conn->query($sql);
    return $res && $res->num_rows > 0;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
$username = trim((string)($input['username'] ?? ''));
$action = trim((string)($input['action'] ?? ''));
$status = strtolower(trim((string)($input['status'] ?? 'success')));
$details = trim((string)($input['details'] ?? ''));
$clientLocalIp = trim((string)($input['client_local_ip'] ?? ''));
$clientTimeUtc = trim((string)($input['client_time_utc'] ?? ''));
$clientTimezone = trim((string)($input['client_timezone'] ?? ''));
$clientTzOffsetMinutes = isset($input['client_tz_offset_minutes']) ? (int)$input['client_tz_offset_minutes'] : null;
$requestIp = hackme_client_ip();

if ($userId < 1 || $action === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing user_id or action']);
    exit;
}

if (!in_array($action, ['logout', 'access_restricted', 'url_tamper_attempt'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unsupported action']);
    exit;
}

if ($username === '') {
    $uRes = $conn->query("SELECT username FROM users WHERE user_id = " . $userId . " LIMIT 1");
    if ($uRes && $uRes->num_rows > 0) {
        $uRow = $uRes->fetch_assoc();
        $username = (string)($uRow['username'] ?? ('user_' . $userId));
    } else {
        $username = 'user_' . $userId;
    }
}

$activeBlock = hackme_is_blocked_now($conn, $userId > 0 ? $userId : null, $requestIp);
if (!empty($activeBlock['blocked'])) {
    // Record the attempted action itself, even while blocked, for timeline visibility.
    hackme_write_audit_log($conn, [
        'actor_user_id' => $userId > 0 ? $userId : null,
        'actor_username' => $username !== '' ? $username : ('user_' . $userId),
        'action' => $action,
        'status' => 'failed',
        'details' => json_encode([
            'message' => 'Attempt rejected because a temporary security block is active',
            'blocked' => true,
            'block_reason' => (string)($activeBlock['reason'] ?? 'suspicious_score_attack'),
            'blocked_until' => (string)($activeBlock['blocked_until'] ?? ''),
            'client_time_utc' => $clientTimeUtc,
            'client_timezone' => $clientTimezone,
            'client_tz_offset_minutes' => $clientTzOffsetMinutes,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    echo json_encode([
        'success' => true,
        'blocked' => true,
        'warning' => '',
        'suspicious_score' => null,
        'score_level' => 'attack',
        'points_added' => 0,
        'blocked_until' => (string)($activeBlock['blocked_until'] ?? ''),
    ]);
    exit;
}

$email = '';
$userLookup = $conn->query("SELECT email FROM users WHERE user_id = " . $userId . " LIMIT 1");
if ($userLookup && $userLookup->num_rows > 0) {
    $uRow = $userLookup->fetch_assoc();
    $email = trim((string)($uRow['email'] ?? ''));
}

$ok = hackme_write_audit_log($conn, [
    'actor_user_id' => $userId,
    'actor_username' => $username,
    'action' => $action,
    'status' => in_array($status, ['success', 'failed'], true) ? $status : 'success',
    'details' => json_encode([
        'message' => $details !== '' ? $details : 'User logout',
        'email' => $email,
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'ip_address' => $requestIp,
    'client_local_ip' => $clientLocalIp,
    'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
]);

$blocked = false;
$scoreRes = ['blocked' => false, 'score' => 0, 'level' => 'normal', 'blocked_until' => '', 'reason' => '', 'points_added' => 0];
$warning = '';
if ($action === 'url_tamper_attempt') {
    $scoreRes = hackme_apply_suspicious_score(
        $conn,
        'url_tamper_attempt',
        $userId > 0 ? $userId : null,
        $requestIp,
        60
    );
    $alertMeta = hackme_send_security_alert_meta(
        $conn,
        'url_tamper_attempt',
        $username !== '' ? $username : ('user_' . $userId),
        hackme_alert_ip($requestIp, $clientLocalIp),
        $clientTimeUtc !== '' ? $clientTimeUtc : gmdate('Y-m-d\TH:i:s\Z'),
        [
            'client_timezone' => $clientTimezone,
            'score' => (int)($scoreRes['score'] ?? 0),
            'score_level' => (string)($scoreRes['level'] ?? 'normal'),
            'blocked' => !empty($scoreRes['blocked']) ? 'yes' : 'no',
        ]
    );
    $alertSent = !empty($alertMeta['sent']);
    $blocked = (bool)($scoreRes['blocked'] ?? false);
    if (!$blocked && (($scoreRes['level'] ?? 'normal') === 'suspicious')) {
        $warning = 'Security warning: suspicious behavior detected on your activity.';
    }
    if ($blocked) {
        $blockReason = (string)($scoreRes['reason'] ?? 'suspicious_score_attack');
        if (!hackme_recent_security_block_logged($conn, $userId, $requestIp, $blockReason)) {
            hackme_write_audit_log($conn, [
                'actor_user_id' => $userId,
                'actor_username' => $username !== '' ? $username : ('user_' . $userId),
                'action' => 'security_block',
                'status' => 'failed',
                'details' => json_encode([
                    'message' => 'User temporarily blocked after repeated URL tamper attempts',
                    'email' => $email,
                    'blocked' => true,
                    'suspicious_score' => (int)($scoreRes['score'] ?? 0),
                    'score_level' => (string)($scoreRes['level'] ?? 'attack'),
                    'score_by_user' => (int)($scoreRes['score_by_user'] ?? 0),
                    'score_by_ip' => (int)($scoreRes['score_by_ip'] ?? 0),
                    'score_triggered_by' => (string)($scoreRes['triggered_by'] ?? ''),
                    'attack_type' => 'url_tamper_attempt',
                    'target' => 'request_parameters',
                    'alert_email_sent' => $alertSent ? 'yes' : 'no',
                    'alert_email_sent_count' => (int)($alertMeta['sent_count'] ?? 0),
                    'alert_email_recipients' => (int)($alertMeta['recipients'] ?? 0),
                    'alert_email_error' => (string)($alertMeta['error'] ?? ''),
                    'block_reason' => $blockReason,
                    'blocked_until' => (string)($scoreRes['blocked_until'] ?? ''),
                    'block_duration_minutes' => 1,
                    'target' => 'request_parameters',
                    'client_time_utc' => $clientTimeUtc,
                    'client_timezone' => $clientTimezone,
                    'client_tz_offset_minutes' => $clientTzOffsetMinutes,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'ip_address' => $requestIp,
                'client_local_ip' => $clientLocalIp,
                'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
            ]);
        }
    }
} elseif ($action === 'access_restricted') {
    $scoreRes = hackme_apply_suspicious_score(
        $conn,
        'access_restricted',
        $userId > 0 ? $userId : null,
        $requestIp,
        60
    );
    $alertMeta = hackme_send_security_alert_meta(
        $conn,
        'access_restricted',
        $username !== '' ? $username : ('user_' . $userId),
        hackme_alert_ip($requestIp, $clientLocalIp),
        $clientTimeUtc !== '' ? $clientTimeUtc : gmdate('Y-m-d\TH:i:s\Z'),
        [
            'client_timezone' => $clientTimezone,
            'score' => (int)($scoreRes['score'] ?? 0),
            'score_level' => (string)($scoreRes['level'] ?? 'normal'),
            'blocked' => !empty($scoreRes['blocked']) ? 'yes' : 'no',
        ]
    );
    $alertSent = !empty($alertMeta['sent']);
    $blocked = (bool)($scoreRes['blocked'] ?? false);
    if (!$blocked && (($scoreRes['level'] ?? 'normal') === 'suspicious')) {
        $warning = 'Security warning: suspicious behavior detected on your activity.';
    }
    if ($blocked) {
        $blockReason = (string)($scoreRes['reason'] ?? 'suspicious_score_attack');
        if (!hackme_recent_security_block_logged($conn, $userId, $requestIp, $blockReason)) {
            hackme_write_audit_log($conn, [
                'actor_user_id' => $userId,
                'actor_username' => $username !== '' ? $username : ('user_' . $userId),
                'action' => 'security_block',
                'status' => 'failed',
                'details' => json_encode([
                    'message' => 'User temporarily blocked after repeated restricted-page access attempts',
                    'email' => $email,
                    'blocked' => true,
                    'suspicious_score' => (int)($scoreRes['score'] ?? 0),
                    'score_level' => (string)($scoreRes['level'] ?? 'attack'),
                    'score_by_user' => (int)($scoreRes['score_by_user'] ?? 0),
                    'score_by_ip' => (int)($scoreRes['score_by_ip'] ?? 0),
                    'score_triggered_by' => (string)($scoreRes['triggered_by'] ?? ''),
                    'attack_type' => 'access_restricted',
                    'target' => 'restricted_route',
                    'alert_email_sent' => $alertSent ? 'yes' : 'no',
                    'alert_email_sent_count' => (int)($alertMeta['sent_count'] ?? 0),
                    'alert_email_recipients' => (int)($alertMeta['recipients'] ?? 0),
                    'alert_email_error' => (string)($alertMeta['error'] ?? ''),
                    'block_reason' => $blockReason,
                    'blocked_until' => (string)($scoreRes['blocked_until'] ?? ''),
                    'block_duration_minutes' => 1,
                    'target' => 'restricted_route',
                    'client_time_utc' => $clientTimeUtc,
                    'client_timezone' => $clientTimezone,
                    'client_tz_offset_minutes' => $clientTzOffsetMinutes,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'ip_address' => $requestIp,
                'client_local_ip' => $clientLocalIp,
                'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
            ]);
        }
    }
}

echo json_encode([
    'success' => (bool)$ok,
    'blocked' => $blocked,
    'warning' => $warning,
    'suspicious_score' => (int)($scoreRes['score'] ?? 0),
    'score_level' => (string)($scoreRes['level'] ?? 'normal'),
    'points_added' => (int)($scoreRes['points_added'] ?? 0),
]);
