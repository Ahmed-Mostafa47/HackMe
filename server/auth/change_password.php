<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/audit_log.php';
require_once __DIR__ . '/../utils/security_block.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$data = file_get_contents('php://input');
$input = json_decode($data, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit;
}

if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid request data']);
    exit;
}

if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;
$old_password = isset($input['old_password']) ? $input['old_password'] : '';
$new_password = isset($input['new_password']) ? $input['new_password'] : '';
$clientLocalIp = isset($input['client_local_ip']) ? trim((string)$input['client_local_ip']) : '';
$clientTimeUtc = trim((string)($input['client_time_utc'] ?? ''));
$clientTimezone = trim((string)($input['client_timezone'] ?? ''));
$clientTzOffsetMinutes = isset($input['client_tz_offset_minutes']) ? (int)$input['client_tz_offset_minutes'] : null;
$requestIp = hackme_client_ip();

// Log incoming request
error_log("=== CHANGE PASSWORD REQUEST ===");
error_log("User ID: " . $user_id);
error_log("Old Password length: " . strlen($old_password));
error_log("New Password length: " . strlen($new_password));

// Validation
if (!$user_id || !$old_password || !$new_password) {
    hackme_write_audit_log($conn, [
        'actor_user_id' => $user_id > 0 ? $user_id : null,
        'action' => 'password_change',
        'status' => 'failed',
        'details' => 'Missing required password change fields',
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    echo json_encode(['success' => false, 'message' => 'User ID, old password, and new password are required']);
    exit;
}

if (strlen($new_password) < 8) {
    hackme_write_audit_log($conn, [
        'actor_user_id' => $user_id,
        'action' => 'password_change',
        'status' => 'failed',
        'details' => 'New password too short',
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters long']);
    exit;
}

// Fetch current user and their password hash
$user_stmt = $conn->prepare('SELECT username, email, password_hash FROM users WHERE user_id = ? LIMIT 1');
if (!$user_stmt) {
    error_log("Prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$user_stmt->bind_param('i', $user_id);
$user_stmt->execute();
$user_result = $user_stmt->get_result();
$user = $user_result->fetch_assoc();
$user_stmt->close();

if (!$user) {
    error_log("User not found with ID: " . $user_id);
    hackme_write_audit_log($conn, [
        'actor_user_id' => $user_id,
        'action' => 'password_change',
        'status' => 'failed',
        'details' => 'User not found',
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

$existingBlock = hackme_is_blocked_now($conn, $user_id, $requestIp);
if (!empty($existingBlock['blocked'])) {
    hackme_write_audit_log($conn, [
        'actor_user_id' => $user_id,
        'actor_username' => (string)($user['email'] ?? $user['username'] ?? 'unknown'),
        'action' => 'security_block',
        'status' => 'failed',
        'details' => json_encode([
            'message' => 'Password change blocked due to active temporary block',
            'email' => (string)($user['email'] ?? ''),
            'blocked' => true,
            'block_reason' => (string)($existingBlock['reason'] ?? 'security_block'),
            'blocked_until' => (string)($existingBlock['blocked_until'] ?? ''),
            'client_time_utc' => $clientTimeUtc,
            'client_timezone' => $clientTimezone,
            'client_tz_offset_minutes' => $clientTzOffsetMinutes,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    echo json_encode(['success' => false, 'message' => 'Too many suspicious attempts. Try again in 1 minute.']);
    exit;
}

// Verify old password
if (!password_verify($old_password, $user['password_hash'])) {
    error_log("Old password verification failed for user ID: " . $user_id);
    hackme_write_audit_log($conn, [
        'actor_user_id' => $user_id,
        'actor_username' => (string)($user['email'] ?? $user['username'] ?? 'unknown'),
        'action' => 'password_change',
        'status' => 'failed',
        'details' => json_encode([
            'message' => 'Current password is incorrect',
            'email' => (string)($user['email'] ?? ''),
            'client_time_utc' => $clientTimeUtc,
            'client_timezone' => $clientTimezone,
            'client_tz_offset_minutes' => $clientTzOffsetMinutes,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    $blockResult = hackme_record_event_and_maybe_block(
        $conn,
        'password_change_failed',
        $user_id,
        $requestIp,
        3,
        'password_change_bruteforce',
        60,
        60
    );
    if (!empty($blockResult['blocked'])) {
        hackme_write_audit_log($conn, [
            'actor_user_id' => $user_id,
            'actor_username' => (string)($user['email'] ?? $user['username'] ?? 'unknown'),
            'action' => 'password_change_rate_limit',
            'status' => 'failed',
            'details' => json_encode([
                'message' => 'Password change blocked after repeated incorrect current password attempts',
                'email' => (string)($user['email'] ?? ''),
                'blocked' => true,
                'attempts_last_minute' => (int)($blockResult['attempts'] ?? 0),
                'block_reason' => (string)($blockResult['reason'] ?? 'password_change_bruteforce'),
                'blocked_until' => (string)($blockResult['blocked_until'] ?? ''),
                'client_time_utc' => $clientTimeUtc,
                'client_timezone' => $clientTimezone,
                'client_tz_offset_minutes' => $clientTzOffsetMinutes,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'ip_address' => $requestIp,
            'client_local_ip' => $clientLocalIp,
            'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
        ]);
        echo json_encode(['success' => false, 'message' => 'Too many password attempts. Try again in 1 minute.']);
        exit;
    }
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
    exit;
}

error_log("Old password verified successfully");

// Hash the new password
$new_password_hash = password_hash($new_password, PASSWORD_BCRYPT);

// Update user password
$update_stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');
if (!$update_stmt) {
    error_log("Update prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$update_stmt->bind_param('si', $new_password_hash, $user_id);

if (!$update_stmt->execute()) {
    error_log("Update execute failed: " . $update_stmt->error);
    hackme_write_audit_log($conn, [
        'actor_user_id' => $user_id,
        'action' => 'password_change',
        'status' => 'failed',
        'details' => 'Failed to update password in database',
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    echo json_encode(['success' => false, 'message' => 'Failed to update password']);
    $update_stmt->close();
    exit;
}

$update_stmt->close();

error_log("Password updated successfully for user ID: " . $user_id);

hackme_write_audit_log($conn, [
    'actor_user_id' => $user_id,
    'actor_username' => (string)($user['email'] ?? $user['username'] ?? 'unknown'),
    'action' => 'password_change',
    'status' => 'success',
    'details' => json_encode([
        'message' => 'Password changed successfully',
        'email' => (string)($user['email'] ?? ''),
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'ip_address' => $requestIp,
    'client_local_ip' => $clientLocalIp,
    'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
]);

echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
?>

