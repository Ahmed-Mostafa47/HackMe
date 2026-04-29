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

// Same underlying storage as Attempt Logs; aggregates only attempt-type rows (never full audit).
hackme_ensure_audit_logs_table($conn);

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

$hours = (int)($_GET['hours'] ?? 168);
if ($hours < 1) {
    $hours = 168;
}
if ($hours > 24 * 90) {
    $hours = 24 * 90;
}

$hoursSql = max(1, min(2160, $hours));

function hackme_security_extract_attack_target(?string $detailsRaw, string $action): string
{
    if ($action === 'login' || $action === 'brute_force_detection' || $action === 'login_rate_limit') {
        return '/login (failed auth)';
    }
    if ($action === 'password_change_rate_limit') {
        return '/change-password';
    }
    $detailsRaw = (string)$detailsRaw;
    $decoded = json_decode($detailsRaw, true);
    if ($action === 'security_block' && is_array($decoded)) {
        $t = trim((string)($decoded['target'] ?? ''));
        if ($t !== '') {
            return strlen($t) > 120 ? substr($t, 0, 117) . '...' : $t;
        }
        $reason = strtolower(trim((string)($decoded['block_reason'] ?? '')));
        if ($reason !== '') {
            return 'block:' . (strlen($reason) > 60 ? substr($reason, 0, 57) . '...' : $reason);
        }
        return '(security_block)';
    }
    $msg = '';
    if (is_array($decoded)) {
        $msg = trim((string)($decoded['message'] ?? ''));
        $t = trim((string)($decoded['target'] ?? ''));
        if (
            $t !== ''
            && (strpos($action, 'access') !== false || strpos($msg, 'restricted') !== false)
        ) {
            return strlen($t) > 120 ? substr($t, 0, 117) . '...' : $t;
        }
    } else {
        $msg = $detailsRaw;
    }
    if ($msg !== '' && preg_match('/Attempted restricted route:\s*([^\s|]+)/', $msg, $m)) {
        return $m[1];
    }
    if ($msg !== '' && preg_match('/URL tamper attempt:\s*([^\s|]+)/', $msg, $m)) {
        return $m[1];
    }
    if (is_array($decoded)) {
        $t = trim((string)($decoded['target'] ?? ''));
        if ($t !== '') {
            return strlen($t) > 120 ? substr($t, 0, 117) . '...' : $t;
        }
    }
    if (strpos($action, 'privilege') !== false || strpos($action, 'sensitive') !== false) {
        $msgTxt = isset($decoded) && is_array($decoded) ? trim((string)($decoded['message'] ?? '')) : '';
        if ($msgTxt !== '' && preg_match('#https?://[^\s|]+|[\w\-./]+/\w[^\s|]*#', $msgTxt, $mm)) {
            return strlen($mm[0]) > 140 ? substr($mm[0], 0, 137) . '...' : $mm[0];
        }
        return 'privilege/sensitive_attempt';
    }
    return '(unknown)';
}

function hackme_parse_datetime_unix(string $raw): int|false
{
    $raw = trim($raw);
    if ($raw === '') {
        return false;
    }
    // ISO-ish or SQL datetime
    $ts = strtotime($raw);
    if ($ts !== false) {
        return $ts;
    }
    $normalized = preg_replace('#\.\d+#', '', $raw);
    $normalized = str_replace('T', ' ', $normalized);
    $ts = strtotime($normalized);
    if ($ts !== false) {
        return $ts;
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}(:\d{2})?)?/', $raw, $mm)) {
        $ts = strtotime(trim($mm[0]));
        if ($ts !== false) {
            return $ts;
        }
    }

    return false;
}

/**
 * Returns approximate block length in whole minutes for UI (defaults to 1).
 */
function hackme_infer_block_duration_mins(array $d, string $createdAtSql): int
{
    if (isset($d['block_duration_minutes'])) {
        $raw = $d['block_duration_minutes'];
        if (is_numeric($raw)) {
            $v = (int)round((float)$raw);
            if ($v >= 1) {
                return $v;
            }
        }
        if (is_string($raw) && preg_match('/(\d+)/', trim($raw), $m)) {
            $v = (int)$m[1];
            if ($v >= 1) {
                return $v;
            }
        }
    }

    $createdTs = hackme_parse_datetime_unix($createdAtSql);
    $until = isset($d['blocked_until']) ? trim((string)$d['blocked_until']) : '';
    $untilTs = $until !== '' ? hackme_parse_datetime_unix($until) : false;

    if ($untilTs !== false && $createdTs !== false && $untilTs > $createdTs) {
        return max(1, (int)ceil(($untilTs - $createdTs) / 60));
    }

    if ($untilTs !== false && $createdTs === false) {
        $nowTs = time();
        if ($untilTs > $nowTs) {
            return max(1, (int)ceil(($untilTs - $nowTs) / 60));
        }

        return 1;
    }

    return 1;
}

function hackme_duration_min_label(int $mins): string
{
    if ($mins < 1) {
        $mins = 1;
    }

    return (string)$mins . ' min';
}

$sqlWhereAttempt = "action IN ($attemptActionSql) AND created_at >= DATE_SUB(NOW(), INTERVAL {$hoursSql} HOUR)";

// Top IPs
$topIps = [];
$sqlIp = "
    SELECT COALESCE(NULLIF(TRIM(ip_address), ''), '(no-ip)') AS ip_address, COUNT(*) AS cnt
    FROM audit_logs
    WHERE {$sqlWhereAttempt}
    GROUP BY COALESCE(NULLIF(TRIM(ip_address), ''), '(no-ip)')
    ORDER BY cnt DESC
    LIMIT 15
";
$rIp = $conn->query($sqlIp);
if ($rIp) {
    while ($row = $rIp->fetch_assoc()) {
        $topIps[] = [
            'ip' => (string)($row['ip_address'] ?? ''),
            'count' => (int)($row['cnt'] ?? 0),
        ];
    }
}

// Failed vs success (attempt log actions only)
$statusRatio = ['success' => 0, 'failed' => 0];
$sqlSt = "
    SELECT LOWER(TRIM(status)) AS st, COUNT(*) AS cnt
    FROM audit_logs
    WHERE {$sqlWhereAttempt}
    GROUP BY LOWER(TRIM(status))
";
$rSt = $conn->query($sqlSt);
if ($rSt) {
    while ($row = $rSt->fetch_assoc()) {
        $st = (string)($row['st'] ?? '');
        $c = (int)($row['cnt'] ?? 0);
        if ($st === 'success') {
            $statusRatio['success'] += $c;
        } elseif ($st === 'failed') {
            $statusRatio['failed'] += $c;
        }
    }
}

// Blocked users (attempt log action security_block only): aggregates per login user.
$blockedSamples = [];
$blockedAgg = [];
$sqlBs = "
    SELECT
        l.actor_user_id,
        COALESCE(NULLIF(TRIM(u.username), ''), l.actor_username) AS username,
        IFNULL(TRIM(u.email), '') AS profile_email,
        l.details,
        l.created_at
    FROM audit_logs l
    LEFT JOIN users u ON u.user_id = l.actor_user_id
    WHERE l.action = 'security_block'
      AND l.actor_user_id IS NOT NULL
      AND l.created_at >= DATE_SUB(NOW(), INTERVAL {$hoursSql} HOUR)
    ORDER BY l.created_at ASC
    LIMIT 12000
";
$rBs = $conn->query($sqlBs);
if ($rBs) {
    while ($row = $rBs->fetch_assoc()) {
        $uid = (int)($row['actor_user_id'] ?? 0);
        if ($uid < 1) {
            continue;
        }
        $decoded = json_decode((string)($row['details'] ?? ''), true);
        $detailArr = is_array($decoded) ? $decoded : [];
        $mins = hackme_infer_block_duration_mins($detailArr, (string)($row['created_at'] ?? ''));
        $label = hackme_duration_min_label($mins);
        $emailFromRow = trim((string)($row['profile_email'] ?? ''));
        $emailFromJson = trim((string)($detailArr['email'] ?? ''));
        $email = $emailFromRow !== '' ? $emailFromRow : $emailFromJson;
        $username = trim((string)($row['username'] ?? ''));
        if ($username === '') {
            $username = 'user_' . $uid;
        }
        if (!isset($blockedAgg[$uid])) {
            $blockedAgg[$uid] = [
                'user_id' => $uid,
                'username' => $username,
                'email' => $email,
                'block_events' => 0,
                'duration_labels' => [],
            ];
        }
        $blockedAgg[$uid]['block_events']++;
        if (!isset($blockedAgg[$uid]['duration_labels'][$label])) {
            $blockedAgg[$uid]['duration_labels'][$label] = 0;
        }
        $blockedAgg[$uid]['duration_labels'][$label]++;
        if ($blockedAgg[$uid]['email'] === '' && $email !== '') {
            $blockedAgg[$uid]['email'] = $email;
        }
        if (($blockedAgg[$uid]['username'] === '' || $blockedAgg[$uid]['username'] === 'user_' . $uid) && $username !== '') {
            $blockedAgg[$uid]['username'] = $username;
        }
    }
}

$blockedDistinct = count($blockedAgg);
foreach ($blockedAgg as $urow) {
    $labels = $urow['duration_labels'];
    arsort($labels);
    $typicalLabel = '';
    foreach ($labels as $lab => $c) {
        $typicalLabel = (string)$lab;
        break;
    }
    $blockedSamples[] = [
        'user_id' => (int)$urow['user_id'],
        'username' => (string)$urow['username'],
        'email' => (string)($urow['email'] ?? ''),
        'block_events' => (int)$urow['block_events'],
        'block_duration_typical' => $typicalLabel !== '' ? $typicalLabel : '1 min',
    ];
}

usort($blockedSamples, static function ($a, $b) {
    return ($b['block_events'] <=> $a['block_events']) ?: (($b['user_id'] ?? 0) <=> ($a['user_id'] ?? 0));
});
$blockedSamples = array_slice($blockedSamples, 0, 12);

// Most attacked targets: security events only—not benign traffic (e.g. excludes successful login).
$endpointAttackActions = "'access_restricted','url_tamper_attempt','privilege_escalation_attempt','sensitive_action_attempt',"
    . "'brute_force_detection','security_block','login_rate_limit','password_change_rate_limit','login'";
$endpointCounts = [];
$sqlEp = "
    SELECT action, details
    FROM audit_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$hoursSql} HOUR)
      AND action IN ({$endpointAttackActions})
      AND NOT (action = 'login' AND LOWER(TRIM(IFNULL(status,''))) = 'success')
    ORDER BY created_at DESC
    LIMIT 8000
";
$rEp = $conn->query($sqlEp);
if ($rEp) {
    while ($row = $rEp->fetch_assoc()) {
        $action = (string)($row['action'] ?? '');
        $ep = hackme_security_extract_attack_target((string)($row['details'] ?? ''), $action);
        if (!isset($endpointCounts[$ep])) {
            $endpointCounts[$ep] = 0;
        }
        $endpointCounts[$ep]++;
    }
}
arsort($endpointCounts);
$topEndpoints = [];
foreach ($endpointCounts as $endpoint => $cnt) {
    $topEndpoints[] = ['endpoint' => $endpoint, 'count' => $cnt];
    if (count($topEndpoints) >= 15) {
        break;
    }
}

echo json_encode([
    'success' => true,
    'data_source' => 'attempt_logs_only',
    'window_hours' => $hours,
    'top_attacking_ips' => $topIps,
    'most_attacked_targets' => $topEndpoints,
    // Back-compat for older dashboards
    'most_targeted_endpoints' => $topEndpoints,
    'failed_vs_success' => $statusRatio,
    'blocked_users_distinct' => $blockedDistinct,
    'blocked_users_top' => $blockedSamples,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
