<?php
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

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

$limit = min(50, max(5, (int)($_GET['limit'] ?? 20)));

$res = $conn->query("
    SELECT lb.user_id, u.username, u.full_name, lb.total_points
    FROM leaderboard lb
    JOIN users u ON u.user_id = lb.user_id AND u.is_active = 1
    ORDER BY lb.total_points DESC, lb.last_update DESC
    LIMIT $limit
");

if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $conn->error]);
    exit;
}

$rows = [];
$rank = 1;
while ($row = $res->fetch_assoc()) {
    $rows[] = [
        'rank' => $rank++,
        'user_id' => (int)$row['user_id'],
        'name' => $row['full_name'] ?: $row['username'],
        'username' => $row['username'],
        'points' => (int)$row['total_points'],
    ];
}

echo json_encode(['success' => true, 'leaderboard' => $rows]);
