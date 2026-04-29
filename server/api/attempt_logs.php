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

function hackme_parse_details(?string $raw): array
{
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : [];
}

function hackme_attempt_severity(array $log, array $details): string
{
    $action = strtolower(trim((string)($log['action'] ?? '')));
    $status = strtolower(trim((string)($log['status'] ?? '')));
    $attackActions = [
        'access_restricted',
        'url_tamper_attempt',
        'privilege_escalation_attempt',
        'sensitive_action_attempt',
        'brute_force_detection',
        'security_block',
        'login_rate_limit',
        'password_change_rate_limit',
    ];

    // Severity is only for security attack events, not all events.
    if (!in_array($action, $attackActions, true)) {
        return '-';
    }

    if ($action === 'security_block') {
        return 'critical';
    }
    if (in_array($action, ['brute_force_detection', 'login_rate_limit', 'password_change_rate_limit'], true)) {
        return 'high';
    }
    if (in_array($action, ['privilege_escalation_attempt', 'sensitive_action_attempt'], true)) {
        return 'high';
    }
    if (in_array($action, ['url_tamper_attempt', 'access_restricted'], true)) {
        return $status === 'failed' ? 'medium' : 'low';
    }
    if ($action === 'login' && $status === 'failed') {
        return 'medium';
    }
    if (isset($details['blocked']) && (bool)$details['blocked'] === true) {
        return 'high';
    }
    return 'low';
}

function hackme_is_private_ip(string $ip): bool
{
    if ($ip === '' || $ip === '127.0.0.1' || $ip === '::1' || strtolower($ip) === 'localhost') {
        return true;
    }
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $long = ip2long($ip);
        if ($long === false) return false;
        $ranges = [
            ['10.0.0.0', '10.255.255.255'],
            ['172.16.0.0', '172.31.255.255'],
            ['192.168.0.0', '192.168.255.255'],
            ['169.254.0.0', '169.254.255.255'],
        ];
        foreach ($ranges as [$start, $end]) {
            $s = ip2long($start);
            $e = ip2long($end);
            if ($s !== false && $e !== false && $long >= $s && $long <= $e) {
                return true;
            }
        }
    }
    return false;
}

function hackme_geo_info_from_ip(?string $ip): string
{
    $ip = trim((string)$ip);
    if ($ip === '') return 'unknown';
    if ($ip === '127.0.0.1' || $ip === '::1' || strtolower($ip) === 'localhost') {
        return 'localhost / local machine';
    }
    if (hackme_is_private_ip($ip)) {
        return 'private-network / local subnet';
    }

    // Best-effort country/city enrichment for public IPs.
    $country = '';
    $city = '';

    if (function_exists('curl_init')) {
        $url = 'http://ip-api.com/json/' . rawurlencode($ip) . '?fields=status,country,city';
        $ch = curl_init($url);
        if ($ch !== false) {
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            $resp = curl_exec($ch);
            curl_close($ch);
            if (is_string($resp) && $resp !== '') {
                $decoded = json_decode($resp, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && (($decoded['status'] ?? '') === 'success')) {
                    $country = trim((string)($decoded['country'] ?? ''));
                    $city = trim((string)($decoded['city'] ?? ''));
                }
            }
        }
    }

    if ($country !== '' && $city !== '') {
        return $country . ' - ' . $city;
    }
    if ($country !== '') {
        return $country;
    }
    return 'public-ip / geo-unavailable';
}

$currentUserId = (int)($_GET['current_user_id'] ?? 0);
if ($currentUserId < 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Missing current_user_id']);
    exit;
}

$authorized = isSuperAdmin($conn, $currentUserId);
if (!$authorized) {
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

$limit = (int)($_GET['limit'] ?? 200);
if ($limit < 1) $limit = 200;
if ($limit > 500) $limit = 500;

$action = trim((string)($_GET['action'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));
$search = trim((string)($_GET['search'] ?? ''));
$ipExact = trim((string)($_GET['ip'] ?? ''));

$attemptActions = [
    'login',
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

$where = [];
$where[] = "l.action IN ($attemptActionSql)";

if ($action !== '' && in_array($action, $attemptActions, true)) {
    $where[] = "l.action = '" . $conn->real_escape_string($action) . "'";
}
if ($status !== '') {
    $where[] = "l.status = '" . $conn->real_escape_string($status) . "'";
}
// Exact IP match (used from security dashboard drill-down). Mutually excludes free-text search.
if ($ipExact !== '') {
    $where[] = "TRIM(IFNULL(l.ip_address,'')) = '" . $conn->real_escape_string($ipExact) . "'";
} elseif ($search !== '') {
    $like = $conn->real_escape_string('%' . $search . '%');
    $where[] = "(l.actor_username LIKE '{$like}' OR l.target_username LIKE '{$like}' OR l.details LIKE '{$like}' OR l.user_agent LIKE '{$like}')";
}

$logIdExpr = isset($available['log_id']) ? 'l.log_id' : (isset($available['id']) ? 'l.id AS log_id' : '0 AS log_id');
$actorUserIdRawExpr = isset($available['actor_user_id']) ? 'l.actor_user_id' : 'NULL';
$actorUserExpr = $actorUserIdRawExpr . ' AS actor_user_id';
$actorNameExpr = isset($available['actor_username']) ? 'l.actor_username' : (isset($available['username']) ? 'l.username AS actor_username' : 'NULL AS actor_username');
$actionExpr = isset($available['action']) ? 'l.action' : (isset($available['event']) ? 'l.event AS action' : "'unknown' AS action");
$statusExpr = isset($available['status']) ? 'l.status' : "'success' AS status";
$targetUserIdRawExpr = isset($available['target_user_id']) ? 'l.target_user_id' : 'NULL';
$targetUserExpr = $targetUserIdRawExpr . ' AS target_user_id';
$targetNameExpr = isset($available['target_username']) ? 'l.target_username' : 'NULL AS target_username';
$detailsExpr = isset($available['details']) ? 'l.details' : (isset($available['message']) ? 'l.message AS details' : 'NULL AS details');
$ipExpr = isset($available['ip_address']) ? 'l.ip_address' : (isset($available['ip']) ? 'l.ip AS ip_address' : 'NULL AS ip_address');
$uaExpr = isset($available['user_agent']) ? 'l.user_agent' : 'NULL AS user_agent';
$createdExpr = isset($available['created_at']) ? 'l.created_at' : (isset($available['timestamp']) ? 'l.timestamp AS created_at' : 'NOW() AS created_at');
$actorEmailExpr = "(SELECT u.email FROM users u WHERE u.user_id = {$actorUserIdRawExpr} LIMIT 1) AS actor_email";
$actorRolesExpr = "(SELECT GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ',') FROM user_roles ur INNER JOIN roles r ON r.role_id = ur.role_id WHERE ur.user_id = {$actorUserIdRawExpr}) AS actor_roles";

$sql = "SELECT {$logIdExpr}, {$actorUserExpr}, {$actorNameExpr}, {$actorEmailExpr}, {$actorRolesExpr}, {$actionExpr}, {$statusExpr}, {$targetUserExpr}, {$targetNameExpr}, {$detailsExpr}, {$ipExpr}, {$uaExpr}, {$createdExpr}
        FROM audit_logs l";
if (!empty($where)) {
    $sql .= " WHERE " . implode(' AND ', $where);
}
$sql .= " ORDER BY l.created_at DESC LIMIT " . $limit;

$result = $conn->query($sql);
if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load logs', 'detail' => $conn->error]);
    exit;
}
$logs = [];
while ($row = $result->fetch_assoc()) {
    $details = hackme_parse_details((string)($row['details'] ?? ''));
    $actorId = (int)($row['actor_user_id'] ?? 0);
    $row['is_authenticated'] = $actorId > 0;
    $row['severity'] = hackme_attempt_severity($row, $details);
    $row['geo_info'] = hackme_geo_info_from_ip((string)($row['ip_address'] ?? ''));
    $row['attack_type'] = (string)($details['attack_type'] ?? $details['attackType'] ?? '');

    $explicitCorrelation = trim((string)($details['correlation_id'] ?? $details['correlationId'] ?? ''));
    if ($explicitCorrelation !== '') {
        $row['correlation_id'] = $explicitCorrelation;
    } else {
        $actorKey = $actorId > 0 ? ('u:' . $actorId) : ('ip:' . trim((string)($row['ip_address'] ?? 'unknown')));
        $created = (string)($row['created_at'] ?? '');
        $bucketTs = strtotime($created);
        $minuteBucket = $bucketTs !== false ? date('YmdHi', $bucketTs) : gmdate('YmdHi');
        $row['correlation_id'] = 'corr_' . substr(sha1($actorKey . '|' . (string)($row['action'] ?? '') . '|' . $minuteBucket), 0, 12);
    }
    $logs[] = $row;
}

echo json_encode([
    'success' => true,
    'logs' => $logs,
]);
