<?php
/**
 * Public: SuperAdmin emails for landing-page contact (HackMe penetration-testing platform).
 */

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

require_once __DIR__ . '/../utils/db_connect.php';

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

$res = $conn->query(
    "
    SELECT DISTINCT u.user_id, u.username, u.email
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.user_id
    INNER JOIN roles r ON r.role_id = ur.role_id
    WHERE LOWER(TRIM(r.name)) = 'superadmin'
      AND COALESCE(u.is_active, 1) = 1
    ORDER BY u.username ASC
    "
);

if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

$seen = [];
$contacts = [];

while ($row = $res->fetch_assoc()) {
    $email = isset($row['email']) ? strtolower(trim((string)$row['email'])) : '';
    if ($email === '' || !filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
        continue;
    }
    if (isset($seen[$email])) {
        continue;
    }
    $seen[$email] = true;
    $contacts[] = [
        'username' => (string)($row['username'] ?? ''),
        'email' => (string)$row['email'],
    ];
}

echo json_encode([
    'success' => true,
    'contacts' => $contacts,
]);
