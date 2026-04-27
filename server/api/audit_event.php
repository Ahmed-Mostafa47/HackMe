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
    'ip_address' => hackme_client_ip(),
    'client_local_ip' => $clientLocalIp,
    'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
]);

$blocked = false;
if ($action === 'url_tamper_attempt') {
    $blockRes = hackme_record_url_tamper_and_maybe_block($conn, $userId > 0 ? $userId : null, hackme_client_ip());
    $blocked = (bool)($blockRes['blocked'] ?? false);
    if ($blocked) {
        hackme_write_audit_log($conn, [
            'actor_user_id' => $userId,
            'actor_username' => $email !== '' ? $email : $username,
            'action' => 'security_block',
            'status' => 'failed',
            'details' => json_encode([
                'message' => 'User temporarily blocked after repeated URL tamper attempts',
                'email' => $email,
                'blocked' => true,
                'attempts_last_minute' => (int)($blockRes['attempts'] ?? 0),
                'block_reason' => 'url_tamper_repeated',
                'client_time_utc' => $clientTimeUtc,
                'client_timezone' => $clientTimezone,
                'client_tz_offset_minutes' => $clientTzOffsetMinutes,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'ip_address' => hackme_client_ip(),
            'client_local_ip' => $clientLocalIp,
            'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
        ]);
    }
}

echo json_encode(['success' => (bool)$ok, 'blocked' => $blocked]);
