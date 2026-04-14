<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

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
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed', 'data' => ['labs' => []]]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error', 'data' => ['labs' => []]]);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'data' => ['labs' => []]]);
    exit;
}

$conn->set_charset('utf8mb4');

$res = $conn->query("
    SELECT
        l.lab_id,
        l.title,
        l.description,
        l.icon,
        l.port,
        l.launch_path,
        l.labtype_id,
        l.difficulty,
        l.points_total,
        l.is_published,
        l.visibility,
        COALESCE(COUNT(DISTINCT h.hint_id), 0) AS hints_count
    FROM labs l
    LEFT JOIN challenges c ON c.lab_id = l.lab_id AND c.is_active = 1
    LEFT JOIN hints h ON h.challenge_id = c.challenge_id
    WHERE l.is_published = 1
      AND l.visibility = 'public'
    GROUP BY
        l.lab_id, l.title, l.description, l.icon, l.port, l.launch_path,
        l.labtype_id, l.difficulty, l.points_total, l.is_published, l.visibility
    ORDER BY l.lab_id ASC
");

if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB query error', 'data' => ['labs' => []]]);
    exit;
}

$labs = [];
while ($row = $res->fetch_assoc()) {
    $labId = (int) ($row['lab_id'] ?? 0);
    $labtypeId = (int) ($row['labtype_id'] ?? 0);
    // SQL white-box is a dedicated lab (see HACKME_WHITEBOX_SQL_LAB_ID); always expose as WHITE_BOX if DB not migrated.
    if (defined('HACKME_WHITEBOX_SQL_LAB_ID') && $labId === (int) HACKME_WHITEBOX_SQL_LAB_ID) {
        $labtypeId = 1;
    }
    $labs[] = [
        'lab_id' => $labId,
        'title' => (string)($row['title'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'icon' => (string)($row['icon'] ?? 'LAB'),
        'port' => isset($row['port']) ? (int)$row['port'] : null,
        'launch_path' => (string)($row['launch_path'] ?? ''),
        'labtype_id' => $labtypeId,
        'difficulty' => (string)($row['difficulty'] ?? 'easy'),
        'points_total' => (int)($row['points_total'] ?? 0),
        'is_published' => (int)($row['is_published'] ?? 0) === 1,
        'visibility' => (string)($row['visibility'] ?? 'private'),
        'hints_count' => (int)($row['hints_count'] ?? 0),
    ];
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => ['labs' => $labs],
]);
