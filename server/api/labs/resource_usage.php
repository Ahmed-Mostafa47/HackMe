<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
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

$createSql = "
CREATE TABLE IF NOT EXISTS lab_resource_usage (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lab_id INT NOT NULL,
    hint_viewed TINYINT(1) NOT NULL DEFAULT 0,
    solution_viewed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_lab (user_id, lab_id)
)";
$conn->query($createSql);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $labId = (int)($_GET['lab_id'] ?? 0);
    $userId = (int)($_GET['user_id'] ?? 0);
    if ($labId < 1 || $userId < 1) {
        echo json_encode(['success' => false, 'message' => 'Missing lab_id or user_id']);
        exit;
    }

    $res = $conn->query("
        SELECT hint_viewed, solution_viewed
        FROM lab_resource_usage
        WHERE user_id = $userId AND lab_id = $labId
        LIMIT 1
    ");

    if ($res && $res->num_rows > 0) {
        $row = $res->fetch_assoc();
        echo json_encode([
            'success' => true,
            'data' => [
                'hint_viewed' => (int)($row['hint_viewed'] ?? 0) === 1,
                'solution_viewed' => (int)($row['solution_viewed'] ?? 0) === 1,
            ],
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'data' => [
                'hint_viewed' => false,
                'solution_viewed' => false,
            ],
        ]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$labId = (int)($input['lab_id'] ?? 0);
$userId = (int)($input['user_id'] ?? 0);
$resource = trim((string)($input['resource'] ?? ''));
$viewed = !empty($input['viewed']) ? 1 : 0;

if ($labId < 1 || $userId < 1 || !in_array($resource, ['hint', 'solution'], true)) {
    echo json_encode(['success' => false, 'message' => 'Missing or invalid lab_id, user_id, or resource']);
    exit;
}

$hintValue = $resource === 'hint' ? $viewed : 0;
$solutionValue = $resource === 'solution' ? $viewed : 0;

$ok = $conn->query("
    INSERT INTO lab_resource_usage (user_id, lab_id, hint_viewed, solution_viewed)
    VALUES ($userId, $labId, $hintValue, $solutionValue)
    ON DUPLICATE KEY UPDATE
        hint_viewed = GREATEST(hint_viewed, $hintValue),
        solution_viewed = GREATEST(solution_viewed, $solutionValue)
");

if (!$ok) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $conn->error]);
    exit;
}

echo json_encode(['success' => true, 'message' => 'RESOURCE_USAGE_UPDATED']);
