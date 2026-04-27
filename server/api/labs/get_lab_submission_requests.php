<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/lab_submission_requests_zip.php';
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

$userId = (int) ($_GET['user_id'] ?? 0);
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
    AND LOWER(r.name) IN ('admin','superadmin')
  LIMIT 1
");
if (!$rolesRes || $rolesRes->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin or superadmin privileges required']);
    exit;
}

function hackme_ensure_lab_submission_requests_table_get(PdoMysqliShim $conn): void
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

hackme_ensure_lab_submission_requests_table_get($conn);
hackme_ensure_lab_submission_requests_zip_columns($conn);

$sql = "
  SELECT
    r.submission_id,
    r.submitted_by_user_id,
    r.title,
    r.description,
    r.labtype_id,
    r.difficulty,
    r.points_total,
    r.owasp_category,
    r.hints,
    r.solution,
    r.zip_package_path,
    r.zip_original_name,
    r.status,
    r.created_at,
    u.username AS submitter_username
  FROM lab_submission_requests r
  LEFT JOIN users u ON u.user_id = r.submitted_by_user_id
  WHERE r.status = 'pending'
  ORDER BY r.created_at DESC
";
$res = $conn->query($sql);
$requests = [];
if ($res && $res->num_rows > 0) {
    while ($row = $res->fetch_assoc()) {
        $sid = (int) ($row['submission_id'] ?? 0);
        $zp = trim((string) ($row['zip_package_path'] ?? ''));
        $subDir = hackme_lab_storage_root() . DIRECTORY_SEPARATOR . 'submissions' . DIRECTORY_SEPARATOR . $sid;
        $hasZip = ($zp !== '' && is_dir(hackme_lab_storage_root() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $zp)))
            || is_dir($subDir);
        $requests[] = [
            'submission_id' => $sid,
            'submitted_by_user_id' => (int) ($row['submitted_by_user_id'] ?? 0),
            'submitter_username' => (string) ($row['submitter_username'] ?? ''),
            'title' => (string) ($row['title'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'labtype_id' => (int) ($row['labtype_id'] ?? 1),
            'difficulty' => (string) ($row['difficulty'] ?? 'easy'),
            'points_total' => (int) ($row['points_total'] ?? 0),
            'owasp_category' => (string) ($row['owasp_category'] ?? ''),
            'hints' => (string) ($row['hints'] ?? ''),
            'solution' => (string) ($row['solution'] ?? ''),
            'status' => (string) ($row['status'] ?? 'pending'),
            'created_at' => (string) ($row['created_at'] ?? ''),
            'has_zip_package' => $hasZip,
            'zip_original_name' => (string) ($row['zip_original_name'] ?? ''),
        ];
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'requests' => $requests,
    ],
]);
