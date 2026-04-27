<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/permissions.php';
require_once __DIR__ . '/../utils/audit_log.php';

$currentUserId = (int)($_GET['current_user_id'] ?? 0);
if ($currentUserId < 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Missing current_user_id']);
    exit;
}

$authorized = isSuperAdmin($conn, $currentUserId);
if (!$authorized) {
    // Backward compatibility: trust legacy profile_meta.rank = SUPERADMIN
    $uRes = $conn->query("SELECT profile_meta FROM users WHERE user_id = " . $currentUserId . " LIMIT 1");
    if ($uRes && $uRes->num_rows > 0) {
        $uRow = $uRes->fetch_assoc();
        $profileMeta = $uRow['profile_meta'] ?? null;
        if (is_string($profileMeta)) {
            $decoded = json_decode($profileMeta, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $rank = strtoupper(trim((string)($decoded['rank'] ?? '')));
                if ($rank === 'SUPERADMIN') {
                    $authorized = true;
                }
            }
        }
    }
}

if (!$authorized && $currentUserId === 9) {
    // Owner account fallback
    $authorized = true;
}

if (!$authorized) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'SuperAdmin privileges required for this account']);
    exit;
}

hackme_ensure_audit_logs_table($conn);

$available = [];
$schemaRes = $conn->query("SHOW COLUMNS FROM audit_logs");
if ($schemaRes) {
    while ($srow = $schemaRes->fetch_assoc()) {
        $fname = (string)($srow['Field'] ?? '');
        if ($fname !== '') $available[$fname] = true;
    }
}

$limit = (int)($_GET['limit'] ?? 100);
if ($limit < 1) $limit = 100;
if ($limit > 500) $limit = 500;

$action = trim((string)($_GET['action'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));
$search = trim((string)($_GET['search'] ?? ''));

$where = [];
$attemptActions = [
    'access_restricted',
    'url_tamper_attempt',
    'privilege_escalation_attempt',
    'sensitive_action_attempt',
    'brute_force_detection',
    'security_block',
    'login_rate_limit',
    'password_change_rate_limit',
];
$attemptActionSql = "'" . implode("','", array_map([$conn, 'real_escape_string'], $attemptActions)) . "'";
$where[] = "action NOT IN ($attemptActionSql)";

if ($action !== '') {
    $where[] = "action = '" . $conn->real_escape_string($action) . "'";
}
if ($status !== '') {
    $where[] = "status = '" . $conn->real_escape_string($status) . "'";
}
if ($search !== '') {
    $like = $conn->real_escape_string('%' . $search . '%');
    $where[] = "(actor_username LIKE '{$like}' OR target_username LIKE '{$like}' OR details LIKE '{$like}' OR user_agent LIKE '{$like}')";
}

$logIdExpr = isset($available['log_id']) ? 'log_id' : (isset($available['id']) ? 'id AS log_id' : '0 AS log_id');
$actorUserExpr = isset($available['actor_user_id']) ? 'actor_user_id' : 'NULL AS actor_user_id';
$actorNameExpr = isset($available['actor_username']) ? 'actor_username' : (isset($available['username']) ? 'username AS actor_username' : 'NULL AS actor_username');
$actionExpr = isset($available['action']) ? 'action' : (isset($available['event']) ? 'event AS action' : "'unknown' AS action");
$statusExpr = isset($available['status']) ? 'status' : "'success' AS status";
$targetUserExpr = isset($available['target_user_id']) ? 'target_user_id' : 'NULL AS target_user_id';
$targetNameExpr = isset($available['target_username']) ? 'target_username' : 'NULL AS target_username';
$detailsExpr = isset($available['details']) ? 'details' : (isset($available['message']) ? 'message AS details' : 'NULL AS details');
$ipExpr = isset($available['ip_address']) ? 'ip_address' : (isset($available['ip']) ? 'ip AS ip_address' : 'NULL AS ip_address');
$uaExpr = isset($available['user_agent']) ? 'user_agent' : 'NULL AS user_agent';
$createdExpr = isset($available['created_at']) ? 'created_at' : (isset($available['timestamp']) ? 'timestamp AS created_at' : 'NOW() AS created_at');

$sql = "SELECT {$logIdExpr}, {$actorUserExpr}, {$actorNameExpr}, {$actionExpr}, {$statusExpr}, {$targetUserExpr}, {$targetNameExpr}, {$detailsExpr}, {$ipExpr}, {$uaExpr}, {$createdExpr}
        FROM audit_logs";
if (!empty($where)) {
    $sql .= " WHERE " . implode(' AND ', $where);
}
$sql .= " ORDER BY created_at DESC LIMIT " . $limit;

$result = $conn->query($sql);
if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load logs', 'detail' => $conn->error]);
    exit;
}
$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}

echo json_encode([
    'success' => true,
    'logs' => $logs,
]);
