<?php
// Quick test: open in browser to verify API + DB work
// http://localhost/HackMe/server/api/submit_flag_test.php
header('Content-Type: application/json; charset=utf-8');

$out = ['ok' => false, 'steps' => []];

try {
    require_once __DIR__ . '/../utils/db_connect.php';
    $out['steps'][] = 'db_connect loaded';
    
    if (!isset($conn) || !$conn) {
        $out['error'] = 'No $conn';
        echo json_encode($out, JSON_PRETTY_PRINT);
        exit;
    }
    $out['steps'][] = 'DB connected';
    
    $tables = ['labs', 'challenges', 'testcases', 'lab_instances', 'submissions', 'leaderboard'];
    foreach ($tables as $t) {
        $r = $conn->query("SELECT 1 FROM $t LIMIT 1");
        $out['tables'][$t] = $r ? 'ok' : ($conn->error ?? 'fail');
    }
    $out['ok'] = true;
} catch (Throwable $e) {
    $out['error'] = $e->getMessage();
    $out['file'] = $e->getFile() . ':' . $e->getLine();
}
echo json_encode($out, JSON_PRETTY_PRINT);
