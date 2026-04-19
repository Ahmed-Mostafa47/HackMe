<?php
/**
 * Check if a lab is solved for a user.
 * GET: ?lab_id=5&user_id=1
 * Returns: { "solved": true|false }
 */
declare(strict_types=1);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$labId = (int)($_GET['lab_id'] ?? 0);
$userId = (int)($_GET['user_id'] ?? 0);
$scope = isset($_GET['scope']) ? trim((string) ($_GET['scope'] ?? '')) : '';
if ($scope !== 'whitebox' && $scope !== 'standard') {
    $scope = '';
}

if ($labId < 1 || $userId < 1) {
    echo json_encode(['solved' => false]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/whitebox_lab1_defaults.php';
} catch (Throwable $e) {
    echo json_encode(['solved' => false]);
    exit;
}

if (!isset($conn) || !$conn) {
    echo json_encode(['solved' => false]);
    exit;
}

$wbSqlId = hackme_whitebox_sql_lab_id();
if ($scope === '') {
    $scope = ($labId === $wbSqlId || $labId === 18 || $labId === 19 || $labId === 20 || $labId === 21)
        ? 'whitebox'
        : 'standard';
}

$labIdEsc = (int)$labId;
$userIdEsc = (int)$userId;

if ($scope === 'whitebox') {
    if ($labIdEsc === 18) {
        $wb = $conn->real_escape_string('whitebox_access_lab18');
    } elseif ($labIdEsc === 19) {
        $wb = $conn->real_escape_string('whitebox_idor_lab19');
    } elseif ($labIdEsc === 20) {
        $wb = $conn->real_escape_string('whitebox_xss_lab20');
    } elseif ($labIdEsc === 21) {
        $wb = $conn->real_escape_string('whitebox_xss_lab21');
    } elseif ($labIdEsc === $wbSqlId) {
        $wb = $conn->real_escape_string(hackme_whitebox_sql_payload_mark());
    } else {
        echo json_encode(['solved' => false, 'scope' => $scope]);
        exit;
    }
    $res = $conn->query("
      SELECT 1 FROM submissions s
      JOIN lab_instances li ON li.instance_id = s.instance_id
      WHERE li.lab_id = $labIdEsc AND s.user_id = $userIdEsc AND s.status = 'graded'
        AND TRIM(COALESCE(s.payload_text, '')) = '$wb'
      LIMIT 1
    ");
} else {
    $res = $conn->query("
      SELECT 1 FROM submissions s
      JOIN lab_instances li ON li.instance_id = s.instance_id
      WHERE li.lab_id = $labIdEsc AND s.user_id = $userIdEsc AND s.status = 'graded'
      LIMIT 1
    ");
}

$solved = ($res && $res->num_rows > 0);
echo json_encode(['solved' => (bool) $solved, 'scope' => $scope]);
