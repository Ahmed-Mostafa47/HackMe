<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_proposal_schema.php';
    require_once __DIR__ . '/../../utils/audit_log.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error']);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
$conn->set_charset('utf8mb4');

function hackme_ensure_lab_submission_requests_table_approve(PdoMysqliShim $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS lab_submission_requests (
        submission_id INT NOT NULL AUTO_INCREMENT,
        submitted_by_user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        labtype_id TINYINT NOT NULL DEFAULT 1,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->query($sql);
}

hackme_ensure_lab_submission_requests_table_approve($conn);
$proposalColsReady = hackme_ensure_labs_proposal_columns($conn);

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$userId = (int) ($input['user_id'] ?? 0);
$submissionId = (int) ($input['submission_id'] ?? 0);
$clientLocalIp = trim((string) ($input['client_local_ip'] ?? ''));

if ($userId < 1 || $submissionId < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing user_id or submission_id']);
    exit;
}

$rolesRes = $conn->query("
  SELECT 1
  FROM user_roles ur
  INNER JOIN roles r ON r.role_id = ur.role_id
  WHERE ur.user_id = $userId
    AND LOWER(r.name) IN ('admin','superadmin')
  LIMIT 1
");
if (!$rolesRes || $rolesRes->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin or superadmin privileges required']);
    exit;
}

$actorUsername = '';
$actorRes = $conn->query("SELECT username FROM users WHERE user_id = $userId LIMIT 1");
if ($actorRes && $actorRes->num_rows > 0) {
    $actorRow = $actorRes->fetch_assoc();
    $actorUsername = (string) ($actorRow['username'] ?? '');
}

$sid = $submissionId;
$sel = $conn->query("
  SELECT submission_id, submitted_by_user_id, title, description, labtype_id, difficulty, points_total, owasp_category, status
  FROM lab_submission_requests
  WHERE submission_id = $sid
  LIMIT 1
");
if (!$sel || $sel->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Submission not found']);
    exit;
}
$row = $sel->fetch_assoc();
if (strtolower((string) ($row['status'] ?? '')) !== 'pending') {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'This request is no longer pending']);
    exit;
}

$title = trim((string) ($row['title'] ?? ''));
$description = trim((string) ($row['description'] ?? ''));
if ($title === '' || $description === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid submission data']);
    exit;
}

$labtypeId = (int) ($row['labtype_id'] ?? 1);
if ($labtypeId < 1 || $labtypeId > 3) {
    $labtypeId = 1;
}
$diffRaw = strtolower(trim((string) ($row['difficulty'] ?? 'easy')));
$difficulty = in_array($diffRaw, ['easy', 'medium', 'hard'], true) ? $diffRaw : 'easy';
$pointsTotal = max(0, (int) ($row['points_total'] ?? 0));
$owaspRaw = trim((string) ($row['owasp_category'] ?? ''));
$owaspKey = preg_replace('/[^a-zA-Z0-9_]/', '_', $owaspRaw);
$owaspKey = substr($owaspKey, 0, 128);
if ($owaspKey === '') {
    $owaspKey = 'a01_broken_access_control';
}

$titleEsc = $conn->real_escape_string(substr($title, 0, 255));
$iconEsc = $conn->real_escape_string('🧪');
$owaspEsc = $conn->real_escape_string($owaspKey);
$marker = '[[hackme_owasp:' . $owaspKey . "]]\n\n";
$descPlainEsc = $conn->real_escape_string($description);
$descWithMarkerEsc = $conn->real_escape_string($marker . $description);

$conn->begin_transaction();
try {
    $upd = $conn->query("
        UPDATE lab_submission_requests
        SET status = 'approved'
        WHERE submission_id = $sid AND status = 'pending'
    ");
    if ($upd !== true || (int) $conn->affected_rows !== 1) {
        $conn->rollback();
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Could not approve (already processed?)']);
        exit;
    }

    if ($proposalColsReady) {
        $sqlIns = "
            INSERT INTO labs (
                title, description, labtype_id, difficulty, points_total,
                created_by, is_published, visibility, docker_image, reset_interval,
                icon, port, launch_path, owasp_category_key, coming_soon
            ) VALUES (
                '$titleEsc', '$descPlainEsc', $labtypeId, '$difficulty', $pointsTotal,
                $userId, 1, 'public', '', 3600,
                '$iconEsc', NULL, '', '$owaspEsc', 1
            )
        ";
    } else {
        $sqlIns = "
            INSERT INTO labs (
                title, description, labtype_id, difficulty, points_total,
                created_by, is_published, visibility, docker_image, reset_interval,
                icon, port, launch_path
            ) VALUES (
                '$titleEsc', '$descWithMarkerEsc', $labtypeId, '$difficulty', $pointsTotal,
                $userId, 1, 'public', '', 3600,
                '$iconEsc', NULL, '__HACKME_SOON__'
            )
        ";
    }
    $ins = $conn->query($sqlIns);
    if ($ins !== true) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create lab row: ' . ($conn->error ?: 'DB error')]);
        exit;
    }
    $newLabId = (int) $conn->insert_id;
    $conn->commit();
} catch (Throwable $e) {
    try {
        $conn->rollback();
    } catch (Throwable) {
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Transaction failed']);
    exit;
}

hackme_write_audit_log($conn, [
    'actor_user_id' => $userId,
    'actor_username' => $actorUsername,
    'action' => 'lab_submission_approve',
    'status' => 'success',
    'details' => json_encode([
        'submission_id' => $submissionId,
        'new_lab_id' => $newLabId,
        'owasp_category_key' => $owaspKey,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'ip_address' => function_exists('hackme_client_ip') ? hackme_client_ip() : '',
    'client_local_ip' => $clientLocalIp,
    'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
]);

echo json_encode([
    'success' => true,
    'message' => 'Approved; lab card added to catalog (coming soon).',
    'data' => [
        'lab_id' => $newLabId,
        'owasp_category_key' => $owaspKey,
        'coming_soon' => true,
    ],
]);
