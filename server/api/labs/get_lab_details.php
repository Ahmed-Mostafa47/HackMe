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
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
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

$labId = (int)($_GET['lab_id'] ?? $_GET['labId'] ?? 0);
if ($labId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id']);
    exit;
}

$labRes = $conn->query("
    SELECT
        lab_id, title, description, icon, port, launch_path,
        labtype_id, difficulty, points_total, is_published, visibility,
        CASE WHEN COALESCE(solution, '') <> '' THEN 1 ELSE 0 END AS has_solution
    FROM labs
    WHERE lab_id = $labId
      AND is_published = 1
      AND visibility = 'public'
    LIMIT 1
");

if (!$labRes || $labRes->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$lab = $labRes->fetch_assoc();

$hintsRes = $conn->query("
    SELECT h.text
    FROM hints h
    INNER JOIN challenges c ON c.challenge_id = h.challenge_id
    WHERE c.lab_id = $labId
      AND c.is_active = 1
    ORDER BY c.order_index ASC, h.hint_id ASC
");

$hints = [];
if ($hintsRes) {
    while ($h = $hintsRes->fetch_assoc()) {
        $text = trim((string)($h['text'] ?? ''));
        if ($text !== '') {
            $hints[] = $text;
        }
    }
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => [
        'lab' => [
            'lab_id' => (int)($lab['lab_id'] ?? 0),
            'title' => (string)($lab['title'] ?? ''),
            'description' => (string)($lab['description'] ?? ''),
            'icon' => (string)($lab['icon'] ?? 'LAB'),
            'port' => isset($lab['port']) ? (int)$lab['port'] : null,
            'launch_path' => (string)($lab['launch_path'] ?? ''),
            'labtype_id' => (int)($lab['labtype_id'] ?? 0),
            'difficulty' => (string)($lab['difficulty'] ?? 'easy'),
            'points_total' => (int)($lab['points_total'] ?? 0),
            'is_published' => (int)($lab['is_published'] ?? 0) === 1,
            'visibility' => (string)($lab['visibility'] ?? 'private'),
            'has_solution' => (int)($lab['has_solution'] ?? 0) === 1,
            'hints' => $hints,
        ],
    ],
]);
