<?php
/**
 * تحقق من وجود اللاب 5 والفلاج في قاعدة البيانات
 * افتح: http://localhost/HackMe/server/api/verify_lab5_flag.php
 */
header("Content-Type: application/json; charset=utf-8");

try {
    require_once __DIR__ . '/../utils/db_connect.php';
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
}

if (!isset($conn) || !$conn) {
    echo json_encode(['ok' => false, 'error' => 'No DB connection']);
    exit;
}

$conn->set_charset('utf8mb4');

$labId = 5;
$expectedFlag = 'FLAG{UNPROTECTED_ADMIN_PANEL}';

$out = ['lab_id' => $labId, 'expected_flag' => $expectedFlag];

$lab = $conn->query("SELECT lab_id, title FROM labs WHERE lab_id = $labId");
$out['lab_exists'] = $lab && $lab->num_rows > 0;
if ($out['lab_exists']) {
    $out['lab_row'] = $lab->fetch_assoc();
}

$challenges = $conn->query("SELECT challenge_id, lab_id, title FROM challenges WHERE lab_id = $labId");
$out['challenges_count'] = $challenges ? $challenges->num_rows : 0;
$out['challenges'] = [];
if ($challenges) {
    while ($row = $challenges->fetch_assoc()) {
        $out['challenges'][] = $row;
    }
}

$flagEsc = $conn->real_escape_string($expectedFlag);
$match = $conn->query("
    SELECT c.challenge_id, c.title, t.testcase_id, t.points,
           TRIM(COALESCE(t.secret_flag_plain,'')) AS db_flag_plain,
           LENGTH(TRIM(COALESCE(t.secret_flag_plain,''))) AS flag_len
    FROM challenges c
    JOIN testcases t ON t.challenge_id = c.challenge_id AND t.active = 1
    WHERE c.lab_id = $labId
    AND (TRIM(COALESCE(t.secret_flag_plain,'')) = '$flagEsc' OR TRIM(COALESCE(t.secret_flag_hash,'')) = '$flagEsc')
");
$out['flag_match_found'] = $match && $match->num_rows > 0;
$out['flag_match_query_ok'] = $match !== false;
if ($match && $match->num_rows > 0) {
    $out['matched_row'] = $match->fetch_assoc();
}

$allTestcases = $conn->query("
    SELECT t.testcase_id, t.challenge_id, t.points, t.active,
           CONCAT(LEFT(TRIM(COALESCE(t.secret_flag_plain,'')), 20), '...') AS flag_preview,
           LENGTH(TRIM(COALESCE(t.secret_flag_plain,''))) AS len
    FROM testcases t
    JOIN challenges c ON c.challenge_id = t.challenge_id
    WHERE c.lab_id = $labId
");
$out['testcases_for_lab5'] = [];
if ($allTestcases) {
    while ($r = $allTestcases->fetch_assoc()) {
        $out['testcases_for_lab5'][] = $r;
    }
}

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
