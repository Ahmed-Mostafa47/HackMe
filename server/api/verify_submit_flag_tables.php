<?php
/**
 * Verification script for submit_flag API tables
 * Run in browser: http://localhost/HackMe/server/api/verify_submit_flag_tables.php
 * Or with ?fix=1 to run seed data
 */
header('Content-Type: application/json; charset=utf-8');

$fix = isset($_GET['fix']) && $_GET['fix'] === '1';

$out = [
    'ok' => true,
    'tables' => [],
    'errors' => [],
    'warnings' => [],
];

// Required structure for submit_flag.php
$required = [
    'users' => ['user_id', 'username', 'email'],
    'labs' => ['lab_id', 'title', 'labtype_id', 'created_by'],
    'lab_types' => ['labtype_id', 'name'],
    'challenges' => ['challenge_id', 'lab_id', 'created_by', 'is_active'],
    'testcases' => ['testcase_id', 'challenge_id', 'secret_flag_plain', 'secret_flag_hash', 'points', 'active'],
    'lab_instances' => ['instance_id', 'lab_id', 'user_id', 'container_id', 'status'],
    'submissions' => ['submission_id', 'instance_id', 'user_id', 'challenge_id', 'type', 'payload_text', 'auto_score', 'final_score', 'status'],
    'leaderboard' => ['user_id', 'total_points', 'last_update'],
];

try {
    require_once __DIR__ . '/../utils/db_connect.php';

    if (!isset($conn) || !$conn) {
        $out['ok'] = false;
        $out['errors'][] = 'Database connection failed';
        echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $conn->set_charset('utf8mb4');

    foreach ($required as $table => $columns) {
        $res = $conn->query("SHOW TABLES LIKE '$table'");
        if (!$res || $res->num_rows === 0) {
            $out['tables'][$table] = 'MISSING';
            $out['errors'][] = "Table '$table' does not exist";
            $out['ok'] = false;
            continue;
        }

        $colsRes = $conn->query("SHOW COLUMNS FROM `$table`");
        $existingCols = [];
        while ($row = $colsRes->fetch_assoc()) {
            $existingCols[] = $row['Field'];
        }

        $missing = array_diff($columns, $existingCols);
        if (!empty($missing)) {
            $out['tables'][$table] = 'INCOMPLETE: missing ' . implode(', ', $missing);
            $out['errors'][] = "Table '$table' missing columns: " . implode(', ', $missing);
            $out['ok'] = false;
        } else {
            $out['tables'][$table] = 'OK';
        }
    }

    // Check data
    if ($out['ok']) {
        $r = $conn->query("SELECT COUNT(*) as c FROM labs");
        $labsCount = $r ? (int)$r->fetch_assoc()['c'] : 0;
        $r = $conn->query("SELECT COUNT(*) as c FROM challenges");
        $challCount = $r ? (int)$r->fetch_assoc()['c'] : 0;
        $r = $conn->query("SELECT COUNT(*) as c FROM testcases WHERE active = 1");
        $tcCount = $r ? (int)$r->fetch_assoc()['c'] : 0;
        $r = $conn->query("SELECT COUNT(*) as c FROM users");
        $usersCount = $r ? (int)$r->fetch_assoc()['c'] : 0;

        $out['data'] = [
            'users' => $usersCount,
            'labs' => $labsCount,
            'challenges' => $challCount,
            'testcases_active' => $tcCount,
        ];

        if ($labsCount === 0 || $challCount === 0 || $tcCount === 0) {
            $out['warnings'][] = 'Missing seed data (labs, challenges, or testcases). Run seed_challenges_testcases.sql or use ?fix=1';
            if ($usersCount === 0) {
                $out['warnings'][] = 'No users in database. Create a user first.';
            }
        }
    }

    // Apply fix if requested
    if ($fix && $out['ok']) {
        $sqlDir = __DIR__ . '/../sql/seed_challenges_testcases.sql';
        if (file_exists($sqlDir)) {
            $sql = file_get_contents($sqlDir);
            // Remove USE statement, we're already connected
            $sql = preg_replace('/^USE\s+\w+;\s*/i', '', $sql);
            $ok = $conn->multi_query($sql);
            if (!$ok) {
                $out['fix_error'] = $conn->error;
            } else {
                while ($conn->more_results()) $conn->next_result();
                $out['fix_applied'] = true;
                $out['message'] = 'Seed data applied. Try submit_flag again.';
            }
        } else {
            $out['fix_error'] = 'seed_challenges_testcases.sql not found';
        }
    }

} catch (Throwable $e) {
    $out['ok'] = false;
    $out['errors'][] = $e->getMessage();
    $out['file'] = $e->getFile() . ':' . $e->getLine();
}

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
