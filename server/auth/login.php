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

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// Simple connectivity check: GET ?ping=1 → {"success":true,"message":"pong"}
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['ping'])) {
	echo json_encode(['success' => true, 'message' => 'pong']);
	exit;
}

require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/permissions.php';
require_once __DIR__ . '/../utils/audit_log.php';
require_once __DIR__ . '/../utils/security_block.php';
require_once __DIR__ . '/../utils/security_alert.php';

// Read JSON body if provided
$data = file_get_contents('php://input');
$input = null;
if ($data !== false && strlen(trim($data)) > 0) {
	$input = json_decode($data, true);
}

// Fallback: support application/x-www-form-urlencoded or multipart/form-data
if ($input === null && !empty($_POST)) {
	$input = [
		'email' => isset($_POST['email']) ? $_POST['email'] : null,
		'password' => isset($_POST['password']) ? $_POST['password'] : null
	];
}

// Check if JSON decoding failed
if ($data && json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data: ' . json_last_error_msg()]);
    exit;
}

// Check if input is null or not an array
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid request data']);
    exit;
}

// Error handling for database connection
if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$email = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? $input['password'] : '';
$clientLocalIp = isset($input['client_local_ip']) ? trim((string)$input['client_local_ip']) : '';
$clientTimeUtc = trim((string)($input['client_time_utc'] ?? ''));
$clientTimezone = trim((string)($input['client_timezone'] ?? ''));
$clientTzOffsetMinutes = isset($input['client_tz_offset_minutes']) ? (int)$input['client_tz_offset_minutes'] : null;
$requestIp = hackme_client_ip();

function hackme_compute_block_duration_minutes(string $blockedUntil): int
{
    $durationMinutes = 1;
    $blockedUntilTs = strtotime($blockedUntil);
    if ($blockedUntilTs !== false) {
        $diffSeconds = $blockedUntilTs - time();
        if ($diffSeconds > 0) {
            $durationMinutes = max(1, (int)ceil($diffSeconds / 60));
        }
    }
    return $durationMinutes;
}

function hackme_safe_actor_name(string $raw): string
{
    $value = trim($raw);
    if ($value === '') {
        return 'guest';
    }
    if (strpos($value, '@') !== false) {
        $value = trim((string)strtok($value, '@'));
    }
    $value = preg_replace('/[^a-zA-Z0-9._-]/', '', $value ?? '');
    $value = trim((string)$value);
    return $value !== '' ? $value : 'guest';
}

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

function hackme_log_security_block_attempt(
    PdoMysqliShim $conn,
    string $requestIp,
    string $clientLocalIp,
    string $email,
    string $reason,
    string $blockedUntil,
    string $clientTimeUtc,
    string $clientTimezone,
    ?int $clientTzOffsetMinutes
): void {
    $durationMinutes = hackme_compute_block_duration_minutes($blockedUntil);
    $detailsPayload = [
        'message' => 'Request blocked due to active temporary block',
        'email' => $email,
        'blocked' => true,
        'block_reason' => $reason,
        'blocked_until' => $blockedUntil,
        'block_duration_minutes' => $durationMinutes,
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ];
    hackme_write_audit_log($conn, [
        'actor_username' => hackme_safe_actor_name($email),
        'action' => 'security_block',
        'status' => 'failed',
        'details' => json_encode($detailsPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
}

function hackme_handle_failed_login_score(
    PdoMysqliShim $conn,
    ?int $userId,
    string $actorUsername,
    string $emailForDetails,
    string $scoreEventKey,
    string $requestIp,
    string $clientLocalIp,
    string $clientTimeUtc,
    string $clientTimezone,
    ?int $clientTzOffsetMinutes
): array {
    $scoreResult = hackme_apply_suspicious_score(
        $conn,
        $scoreEventKey,
        $userId,
        $requestIp,
        60
    );

    $scoreTarget = 'login';
    if ($scoreEventKey === 'password_spray') {
        $scoreTarget = 'password';
    } elseif ($scoreEventKey === 'credential_guess') {
        $scoreTarget = 'email_or_password';
    }

    $alertMeta = hackme_send_security_alert_meta(
        $conn,
        $scoreEventKey,
        hackme_safe_actor_name($actorUsername),
        hackme_alert_ip($requestIp, $clientLocalIp),
        $clientTimeUtc !== '' ? $clientTimeUtc : gmdate('Y-m-d\TH:i:s\Z'),
        [
            'email' => $emailForDetails,
            'client_timezone' => $clientTimezone,
            'score' => (int)($scoreResult['score'] ?? 0),
            'score_level' => (string)($scoreResult['level'] ?? 'normal'),
            'blocked' => !empty($scoreResult['blocked']) ? 'yes' : 'no',
        ]
    );
    $alertSent = !empty($alertMeta['sent']);

    hackme_write_audit_log($conn, [
        'actor_user_id' => $userId !== null && $userId > 0 ? (int)$userId : null,
        'actor_username' => hackme_safe_actor_name($actorUsername),
        'action' => 'suspicious_score_update',
        'status' => (($scoreResult['level'] ?? 'normal') === 'attack') ? 'failed' : 'success',
        'details' => json_encode([
            'message' => 'Suspicious score updated after failed login attempt',
            'email' => $emailForDetails,
            'score_event' => $scoreEventKey,
            'attack_type' => $scoreEventKey,
            'target' => $scoreTarget,
            'score_target' => $scoreTarget,
            'points_added' => (int)($scoreResult['points_added'] ?? 0),
            'suspicious_score' => (int)($scoreResult['score'] ?? 0),
            'score_level' => (string)($scoreResult['level'] ?? 'normal'),
            'score_by_user' => (int)($scoreResult['score_by_user'] ?? 0),
            'score_by_ip' => (int)($scoreResult['score_by_ip'] ?? 0),
            'score_triggered_by' => (string)($scoreResult['triggered_by'] ?? ''),
            'blocked' => !empty($scoreResult['blocked']),
            'alert_email_sent' => $alertSent ? 'yes' : 'no',
            'alert_email_sent_count' => (int)($alertMeta['sent_count'] ?? 0),
            'alert_email_recipients' => (int)($alertMeta['recipients'] ?? 0),
            'alert_email_error' => (string)($alertMeta['error'] ?? ''),
            'block_reason' => (string)($scoreResult['reason'] ?? ''),
            'blocked_until' => (string)($scoreResult['blocked_until'] ?? ''),
            'block_duration_minutes' => hackme_compute_block_duration_minutes((string)($scoreResult['blocked_until'] ?? '')),
            'client_time_utc' => $clientTimeUtc,
            'client_timezone' => $clientTimezone,
            'client_tz_offset_minutes' => $clientTzOffsetMinutes,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);

    if (!empty($scoreResult['blocked'])) {
        hackme_log_security_block_attempt(
            $conn,
            $requestIp,
            $clientLocalIp,
            $emailForDetails,
            (string)($scoreResult['reason'] ?? 'suspicious_score_attack'),
            (string)($scoreResult['blocked_until'] ?? ''),
            $clientTimeUtc,
            $clientTimezone,
            $clientTzOffsetMinutes
        );
    }

    return $scoreResult;
}

$ipBlock = hackme_is_blocked_now($conn, null, $requestIp);
if (!empty($ipBlock['blocked'])) {
    hackme_log_security_block_attempt(
        $conn,
        $requestIp,
        $clientLocalIp,
        $email,
        (string)($ipBlock['reason'] ?? 'security_block'),
        (string)($ipBlock['blocked_until'] ?? ''),
        $clientTimeUtc,
        $clientTimezone,
        $clientTzOffsetMinutes
    );
    echo json_encode(['success' => false, 'message' => 'Too many suspicious attempts. Try again in 1 minute.']);
    exit;
}

function hackme_detect_bruteforce(PdoMysqliShim $conn, string $ipAddress, string $usernameOrEmail, string $clientLocalIp, string $clientTimeUtc, string $clientTimezone, ?int $clientTzOffsetMinutes): void
{
    if ($ipAddress === '') {
        return;
    }
    $ipEsc = $conn->real_escape_string($ipAddress);
    $q = $conn->query("
        SELECT COUNT(*) AS attempts, COUNT(DISTINCT actor_username) AS users_count
        FROM audit_logs
        WHERE action = 'login' AND status = 'failed' AND ip_address = '$ipEsc'
          AND created_at >= (NOW() - INTERVAL 10 MINUTE)
    ");
    if (!$q || $q->num_rows === 0) {
        return;
    }
    $row = $q->fetch_assoc();
    $attempts = (int)($row['attempts'] ?? 0);
    $usersCount = (int)($row['users_count'] ?? 0);
    if ($attempts < 6 || $usersCount < 3) {
        return;
    }
    hackme_write_audit_log($conn, [
        'actor_username' => $usernameOrEmail !== '' ? $usernameOrEmail : 'unknown',
        'action' => 'brute_force_detection',
        'status' => 'failed',
        'details' => json_encode([
            'message' => 'Possible brute force detected',
            'attempts_last_10m' => $attempts,
            'distinct_usernames_last_10m' => $usersCount,
            'client_time_utc' => $clientTimeUtc,
            'client_timezone' => $clientTimezone,
            'client_tz_offset_minutes' => $clientTzOffsetMinutes,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $ipAddress,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
}

if (!$email || !$password) {
    $detailsPayload = [
        'message' => 'Missing email or password',
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ];
    hackme_write_audit_log($conn, [
        'actor_username' => hackme_safe_actor_name($email),
        'action' => 'login',
        'status' => 'failed',
        'details' => json_encode($detailsPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    $scoreResult = hackme_handle_failed_login_score(
        $conn,
        null,
        hackme_safe_actor_name($email),
        $email,
        'credential_guess',
        $requestIp,
        $clientLocalIp,
        $clientTimeUtc,
        $clientTimezone,
        $clientTzOffsetMinutes
    );
    if (!empty($scoreResult['blocked'])) {
        echo json_encode(['success' => false, 'message' => 'Suspicious activity detected. You are temporarily blocked for 1 minute.']);
        exit;
    }
    hackme_detect_bruteforce($conn, $requestIp, $email, $clientLocalIp, $clientTimeUtc, $clientTimezone, $clientTzOffsetMinutes);
    $warn = (($scoreResult['level'] ?? 'normal') === 'suspicious');
    echo json_encode(['success' => false, 'message' => $warn ? 'Email and password are required (warning: suspicious activity detected).' : 'Email and password are required']);
    exit;
}

// Check if user exists by email
$stmt = $conn->prepare('SELECT user_id, username, email, password_hash, full_name, profile_meta FROM users WHERE email = ? AND is_active = 1 LIMIT 1');
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Database prepare failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param('s', $email);
if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $stmt->error]);
    $stmt->close();
    exit;
}

$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

// Check if user exists
if (!$user) {
    // Debug: Check if user exists but is inactive or doesn't exist
    $debug_stmt = $conn->prepare('SELECT user_id, email, is_active FROM users WHERE email = ? LIMIT 1');
    $failedActorUserId = null;
    $failedActorUsername = hackme_safe_actor_name($email);
    if ($debug_stmt) {
        $debug_stmt->bind_param('s', $email);
        $debug_stmt->execute();
        $debug_result = $debug_stmt->get_result();
        $debug_user = $debug_result->fetch_assoc();
        $debug_stmt->close();
        
        if ($debug_user) {
            $failedActorUserId = (int)($debug_user['user_id'] ?? 0);
            if ($failedActorUserId <= 0) {
                $failedActorUserId = null;
            }
            if ($failedActorUserId !== null) {
                $nameStmt = $conn->prepare('SELECT username FROM users WHERE user_id = ? LIMIT 1');
                if ($nameStmt) {
                    $nameStmt->bind_param('i', $failedActorUserId);
                    $nameStmt->execute();
                    $nameRes = $nameStmt->get_result();
                    $nameRow = $nameRes ? $nameRes->fetch_assoc() : null;
                    $nameStmt->close();
                    if (is_array($nameRow) && trim((string)($nameRow['username'] ?? '')) !== '') {
                        $failedActorUsername = trim((string)$nameRow['username']);
                    }
                }
            }
            if ($debug_user['is_active'] == 0) {
                echo json_encode(['success' => false, 'message' => 'Account is inactive. Please contact administrator.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'No account found with this email. Please register first.']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    }
    $detailsPayload = [
        'message' => 'Invalid credentials or inactive account',
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ];
    hackme_write_audit_log($conn, [
        'actor_user_id' => $failedActorUserId,
        'actor_username' => $failedActorUsername,
        'action' => 'login',
        'status' => 'failed',
        'details' => json_encode($detailsPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    $scoreResult = hackme_handle_failed_login_score(
        $conn,
        $failedActorUserId,
        $failedActorUsername,
        $email,
        'credential_guess',
        $requestIp,
        $clientLocalIp,
        $clientTimeUtc,
        $clientTimezone,
        $clientTzOffsetMinutes
    );
    if (!empty($scoreResult['blocked'])) {
        echo json_encode(['success' => false, 'message' => 'Suspicious activity detected. You are temporarily blocked for 1 minute.']);
        exit;
    }
    hackme_detect_bruteforce($conn, $requestIp, $email, $clientLocalIp, $clientTimeUtc, $clientTimezone, $clientTzOffsetMinutes);
    if (($scoreResult['level'] ?? 'normal') === 'suspicious') {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password (warning: suspicious activity detected).']);
        exit;
    }
    exit;
}

$userBlock = hackme_is_blocked_now($conn, (int)$user['user_id'], $requestIp);
if (!empty($userBlock['blocked'])) {
    hackme_log_security_block_attempt(
        $conn,
        $requestIp,
        $clientLocalIp,
        (string)($user['email'] ?? $email),
        (string)($userBlock['reason'] ?? 'security_block'),
        (string)($userBlock['blocked_until'] ?? ''),
        $clientTimeUtc,
        $clientTimezone,
        $clientTzOffsetMinutes
    );
    echo json_encode(['success' => false, 'message' => 'Too many suspicious attempts. Try again in 1 minute.']);
    exit;
}

// Verify password
if (!password_verify($password, $user['password_hash'])) {
    $detailsPayload = [
        'message' => 'Wrong password',
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ];
    hackme_write_audit_log($conn, [
        'actor_user_id' => (int)$user['user_id'],
        'actor_username' => (string)$user['username'],
        'action' => 'login',
        'status' => 'failed',
        'details' => json_encode($detailsPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => $requestIp,
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    $scoreResult = hackme_handle_failed_login_score(
        $conn,
        (int)$user['user_id'],
        (string)$user['username'],
        (string)$user['email'],
        'password_spray',
        $requestIp,
        $clientLocalIp,
        $clientTimeUtc,
        $clientTimezone,
        $clientTzOffsetMinutes
    );
    if (!empty($scoreResult['blocked'])) {
        echo json_encode(['success' => false, 'message' => 'Suspicious activity detected. You are temporarily blocked for 1 minute.']);
        exit;
    }
    hackme_detect_bruteforce($conn, $requestIp, (string)$user['username'], $clientLocalIp, $clientTimeUtc, $clientTimezone, $clientTzOffsetMinutes);
    $warn = (($scoreResult['level'] ?? 'normal') === 'suspicious');
    echo json_encode(['success' => false, 'message' => $warn ? 'Invalid email or password (warning: suspicious activity detected).' : 'Invalid email or password']);
    exit;
}

// Update last login timestamp
$update_stmt = $conn->prepare('UPDATE users SET last_login = NOW() WHERE user_id = ?');
if ($update_stmt) {
    $update_stmt->bind_param('i', $user['user_id']);
    $update_stmt->execute();
    $update_stmt->close();
}

// Parse profile_meta if it's a JSON string
$profile_meta = $user['profile_meta'];
if (is_string($profile_meta)) {
    $profile_meta = json_decode($profile_meta, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $profile_meta = ['avatar' => '🆕', 'rank' => 'OPERATIVE', 'specialization' => 'TRAINING'];
    }
}

// Get user roles from user_roles table
$userRoles = getUserRoles($conn, (int)$user['user_id']);
$userPermissions = getUserPermissions($conn, (int)$user['user_id']);

// If user has no roles, assign default 'user' role
if (empty($userRoles)) {
    // Check if roles table has data (system is set up)
    $rolesCheck = $conn->query("SELECT COUNT(*) as count FROM roles");
    if ($rolesCheck) {
        $rolesCount = $rolesCheck->fetch_assoc()['count'];
        if ($rolesCount > 0) {
            // System is set up, assign default user role
            assignRole($conn, (int)$user['user_id'], 'user');
            $userRoles = getUserRoles($conn, (int)$user['user_id']);
            $userPermissions = getUserPermissions($conn, (int)$user['user_id']);
        }
    }
}

// Backward compatibility: if profile_meta has rank, include it
// But prioritize roles from user_roles table
if (!empty($profile_meta['rank']) && empty($userRoles)) {
    // Legacy support: convert old rank to role if no roles exist
    $legacyRank = strtoupper($profile_meta['rank']);
    if (in_array($legacyRank, ['ADMIN', 'INSTRUCTOR'])) {
        $roleName = strtolower($legacyRank);
        assignRole($conn, (int)$user['user_id'], $roleName);
        $userRoles = getUserRoles($conn, (int)$user['user_id']);
        $userPermissions = getUserPermissions($conn, (int)$user['user_id']);
    }
}

// Get total_points from leaderboard
$points = 0;
$lb = $conn->prepare('SELECT total_points FROM leaderboard WHERE user_id = ? LIMIT 1');
if ($lb) {
    $lb->bind_param('i', $user['user_id']);
    $lb->execute();
    $lbRes = $lb->get_result();
    if ($lbRes && $row = $lbRes->fetch_assoc()) {
        $points = (int)$row['total_points'];
    }
    $lb->close();
}

// Return user data (without password_hash)
$userData = [
    'user_id' => (int)$user['user_id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'full_name' => $user['full_name'],
    'total_points' => $points,
    'profile_meta' => $profile_meta,
    'roles' => $userRoles,
    'permissions' => $userPermissions
];

hackme_write_audit_log($conn, [
    'actor_user_id' => (int)$user['user_id'],
    'actor_username' => (string)$user['username'],
    'action' => 'login',
    'status' => 'success',
    'details' => json_encode([
        'message' => 'User logged in successfully',
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
    'message' => 'Login successful',
    'user' => $userData
]);

if (method_exists($conn, 'close')) {
    $conn->close();
}
?>

