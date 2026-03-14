<?php
/**
 * يشغّل مرة واحدة: يضمن وجود اللاب 5 وتحديه وفلاج FLAG{UNPROTECTED_ADMIN_PANEL}
 * بعدها Submit Flag للاب 5 هيقبل الفلاج ويديك 50 نقطة ويحدّث الـ leaderboard.
 * افتح: http://localhost/HackMe/server/api/ensure_lab5_flag.php
 */
header("Content-Type: application/json; charset=utf-8");

try {
    require_once __DIR__ . '/../utils/db_connect.php';
} catch (Throwable $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'No DB connection']);
    exit;
}

$conn->set_charset('utf8mb4');

$userRow = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1")->fetch_assoc();
$creator = $userRow ? (int) $userRow['user_id'] : 0;
if ($creator < 1) {
    echo json_encode(['success' => false, 'message' => 'No user in DB. Create a user first.']);
    exit;
}

$done = [];

$conn->query("INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES (3, 'ACCESS_CONTROL', 'Access Control & Privilege Escalation')");

if ($conn->query("SELECT 1 FROM labs WHERE lab_id = 5")->num_rows === 0) {
    $conn->query("INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) VALUES (5, 'ACCESS_CONTROL_BYPASS', 'Test role-based access control', 3, 'medium', 100, $creator, 1, 'public', 'cyberops/access-control-lab', 3600)");
    $done[] = 'lab 5 inserted';
}

if ($conn->query("SELECT 1 FROM challenges WHERE lab_id = 5")->num_rows === 0) {
    $conn->query("INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) VALUES (6, 5, $creator, 'UNPROTECTED_ADMIN_PANEL', 'Access the admin panel without authorization', 1, 50, 'medium', 1)");
    $done[] = 'challenge 6 inserted';
}

if ($conn->query("SELECT 1 FROM testcases WHERE challenge_id = 6")->num_rows === 0) {
    $conn->query("INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) VALUES (6, 6, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 50, 1, 'flag_match')");
    $done[] = 'testcase 6 inserted';
}

$conn->query("
    UPDATE testcases t
    INNER JOIN challenges c ON c.challenge_id = t.challenge_id AND c.lab_id = 5
    SET t.secret_flag_plain = 'FLAG{UNPROTECTED_ADMIN_PANEL}', t.secret_flag_hash = 'FLAG{UNPROTECTED_ADMIN_PANEL}', t.points = 50, t.active = 1
");
$done[] = 'testcase updated';

echo json_encode([
    'success' => true,
    'message' => 'Lab 5 and flag FLAG{UNPROTECTED_ADMIN_PANEL} are ready. Submit the flag on Lab 5 page to get +50 pts and leaderboard update.',
    'done' => $done,
]);
