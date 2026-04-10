<?php
/**
 * Dashboard stats for leaderboard page: points, rank, labs completed, mission log.
 */
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

$userId = (int)($_GET['user_id'] ?? 0);
if ($userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing user_id']);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

// Total points (0 if no row)
$ptsRow = $conn->query("SELECT total_points FROM leaderboard WHERE user_id = $userId LIMIT 1");
$totalPoints = 0;
if ($ptsRow && $ptsRow->num_rows > 0) {
    $totalPoints = (int) $ptsRow->fetch_assoc()['total_points'];
}

// Rank: same order as get_leaderboard (points DESC, last_update DESC)
$rank = 1;
$foundInLb = false;
$rankRes = $conn->query("
    SELECT user_id FROM leaderboard
    ORDER BY total_points DESC, last_update DESC
");
if ($rankRes) {
    while ($r = $rankRes->fetch_assoc()) {
        if ((int) $r['user_id'] === $userId) {
            $foundInLb = true;
            break;
        }
        $rank++;
    }
}
if (!$foundInLb) {
    $cntRow = $conn->query("SELECT COUNT(*) AS c FROM leaderboard");
    $rank = $cntRow ? (int) $cntRow->fetch_assoc()['c'] + 1 : 1;
}

// Labs completed: distinct labs with at least one graded submission
$labsDone = 0;
$doneRes = $conn->query("
    SELECT COUNT(DISTINCT li.lab_id) AS c
    FROM submissions s
    INNER JOIN lab_instances li ON li.instance_id = s.instance_id
    WHERE s.user_id = $userId AND s.status = 'graded'
");
if ($doneRes && ($dr = $doneRes->fetch_assoc())) {
    $labsDone = (int) $dr['c'];
}

// Total published labs
$totalLabs = 0;
$tl = $conn->query("SELECT COUNT(*) AS c FROM labs WHERE is_published = 1");
if ($tl && ($tr = $tl->fetch_assoc())) {
    $totalLabs = (int) $tr['c'];
}
if ($totalLabs < 1) {
    $totalLabs = 9;
}

// Graded submissions count (flags / challenges solved)
$vuln = 0;
$vr = $conn->query("SELECT COUNT(*) AS c FROM submissions WHERE user_id = $userId AND status = 'graded'");
if ($vr && ($vrow = $vr->fetch_assoc())) {
    $vuln = (int) $vrow['c'];
}

// Mission log: one row per solved lab, latest submission time
$missionLog = [];
$ml = $conn->query("
    SELECT li.lab_id, l.title AS lab_title, MAX(s.submitted_at) AS submitted_at, MAX(s.final_score) AS points
    FROM submissions s
    INNER JOIN lab_instances li ON li.instance_id = s.instance_id
    INNER JOIN labs l ON l.lab_id = li.lab_id
    WHERE s.user_id = $userId AND s.status = 'graded'
    GROUP BY li.lab_id, l.title
    ORDER BY submitted_at DESC
    LIMIT 50
");
if ($ml) {
    while ($row = $ml->fetch_assoc()) {
        $missionLog[] = [
            'lab_id' => (int) $row['lab_id'],
            'lab_title' => $row['lab_title'] ?? 'LAB',
            'points' => (int) ($row['points'] ?? 0),
            'submitted_at' => $row['submitted_at'] ?? null,
            'status' => 'COMPLETED',
        ];
    }
}

echo json_encode([
    'success' => true,
    'total_points' => $totalPoints,
    'rank' => $rank,
    'labs_completed' => $labsDone,
    'labs_total' => $totalLabs,
    'vulnerabilities' => $vuln,
    'mission_log' => $missionLog,
]);
