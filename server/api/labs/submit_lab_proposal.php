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
    require_once __DIR__ . '/../../utils/lab_submission_requests_zip.php';
    require_once __DIR__ . '/../../utils/audit_log.php';
    require_once __DIR__ . '/../../utils/notification_helper.php';
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

/**
 * @param PdoMysqliShim $conn
 */
function hackme_ensure_lab_submission_requests_table($conn): void
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
        zip_package_path VARCHAR(512) NULL,
        zip_original_name VARCHAR(255) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (submission_id),
        KEY idx_lab_sub_status (status),
        KEY idx_lab_sub_user (submitted_by_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->query($sql);
}

hackme_ensure_lab_submission_requests_table($conn);
hackme_ensure_lab_submission_requests_zip_columns($conn);

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$userId = (int) ($input['user_id'] ?? 0);
$clientLocalIp = trim((string) ($input['client_local_ip'] ?? ''));
if ($userId < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing user_id']);
    exit;
}

$rolesRes = $conn->query("
  SELECT 1
  FROM user_roles ur
  INNER JOIN roles r ON r.role_id = ur.role_id
  WHERE ur.user_id = $userId
    AND LOWER(r.name) IN ('admin','superadmin','instructor')
  LIMIT 1
");
$actorUsername = '';
$actorRes = $conn->query("SELECT username FROM users WHERE user_id = $userId LIMIT 1");
if ($actorRes && $actorRes->num_rows > 0) {
    $actorRow = $actorRes->fetch_assoc();
    $actorUsername = (string) ($actorRow['username'] ?? '');
}
if (!$rolesRes || $rolesRes->num_rows === 0) {
    hackme_write_audit_log($conn, [
        'actor_user_id' => $userId,
        'actor_username' => $actorUsername,
        'action' => 'lab_proposal_submit',
        'status' => 'failed',
        'details' => json_encode(['message' => 'Insufficient permissions'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => hackme_client_ip(),
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Instructor or admin privileges required']);
    exit;
}

$title = trim((string) ($input['title'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$labtypeId = (int) ($input['labtype_id'] ?? 1);
$difficulty = strtolower(trim((string) ($input['difficulty'] ?? 'easy')));
$pointsTotal = (int) ($input['points_total'] ?? 0);
$owaspCategory = trim((string) ($input['owasp_category'] ?? ''));
$hints = trim((string) ($input['hints'] ?? ''));
$solution = trim((string) ($input['solution'] ?? ''));
$uploadToken = trim((string) ($input['upload_token'] ?? ''));
$zipOriginalNameIn = trim((string) ($input['zip_original_name'] ?? ''));

if ($title === '' || mb_strlen($title) > 255) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Title is required (max 255 chars)']);
    exit;
}
if ($description === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Description is required']);
    exit;
}
if (!in_array($labtypeId, [1, 2], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'labtype_id must be 1 (white box) or 2 (black box)']);
    exit;
}
if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid difficulty']);
    exit;
}
if ($pointsTotal < 0 || $pointsTotal > 10000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid points_total range']);
    exit;
}
if (mb_strlen($owaspCategory) > 80) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid owasp_category']);
    exit;
}

$stmt = $conn->prepare('INSERT INTO lab_submission_requests (
    submitted_by_user_id, title, description, labtype_id, difficulty, points_total, owasp_category, hints, solution
) VALUES (?,?,?,?,?,?,?,?,?)');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database prepare failed']);
    exit;
}

$stmt->bind_param(
    'issisisss',
    $userId,
    $title,
    $description,
    $labtypeId,
    $difficulty,
    $pointsTotal,
    $owaspCategory,
    $hints,
    $solution
);
if (!$stmt->execute()) {
    $stmt->close();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save lab proposal']);
    exit;
}
$submissionId = (int) $conn->insert_id;
$stmt->close();

$zipPackaged = false;
if ($uploadToken !== '') {
    $rel = hackme_copy_staged_extract_to_submission($uploadToken, $submissionId);
    if ($rel !== null) {
        $zipPackaged = true;
        $rpEsc = $conn->real_escape_string($rel);
        $onEsc = $conn->real_escape_string(substr($zipOriginalNameIn, 0, 255));
        $conn->query("UPDATE lab_submission_requests SET zip_package_path='$rpEsc', zip_original_name='$onEsc' WHERE submission_id=$submissionId");
    }
}

$modeLabel = $labtypeId === 2 ? 'BLACK_BOX' : 'WHITE_BOX';
$notifTitle = 'New lab approval request';
$notifMessage = sprintf(
    '%s submitted lab "%s" (%s, %s pts, OWASP: %s). Open admin labs to review.%s',
    $actorUsername !== '' ? $actorUsername : ('User #' . $userId),
    $title,
    $modeLabel,
    (string) $pointsTotal,
    $owaspCategory !== '' ? $owaspCategory : '—',
    $zipPackaged ? ' ZIP package attached — download from admin labs.' : ''
);
if (mb_strlen($notifMessage) > 900) {
    $notifMessage = mb_substr($notifMessage, 0, 897) . '...';
}

$recipientsRes = $conn->query("
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  INNER JOIN roles r ON r.role_id = ur.role_id
  WHERE LOWER(r.name) IN ('admin', 'superadmin')
");
$notified = 0;
if ($recipientsRes && $recipientsRes->num_rows > 0) {
    while ($row = $recipientsRes->fetch_assoc()) {
        $rid = (int) ($row['user_id'] ?? 0);
        if ($rid < 1) {
            continue;
        }
        if (send_notification($conn, $rid, $userId, 'lab_request', $notifTitle, $notifMessage, '/admin-labs#lab-proposals')) {
            $notified++;
        }
    }
}

hackme_write_audit_log($conn, [
    'actor_user_id' => $userId,
    'actor_username' => $actorUsername,
    'action' => 'lab_proposal_submit',
    'status' => 'success',
    'details' => json_encode([
        'submission_id' => $submissionId,
        'title' => $title,
        'labtype_id' => $labtypeId,
        'notified_admins' => $notified,
        'zip_packaged' => $zipPackaged,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'ip_address' => hackme_client_ip(),
    'client_local_ip' => $clientLocalIp,
    'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
]);

echo json_encode([
    'success' => true,
    'message' => 'Lab proposal saved and sent to administrators',
    'data' => [
        'submission_id' => $submissionId,
        'notified_count' => $notified,
        'zip_packaged' => $zipPackaged,
    ],
]);
