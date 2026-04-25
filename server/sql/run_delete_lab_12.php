<?php
/**
 * CLI: run delete_lab_12.sql using same DB settings as db_connect.php
 * Usage: php run_delete_lab_12.php
 */
declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/utils/db_connect.php';

if (!isset($conn) || !$conn instanceof mysqli) {
    fwrite(STDERR, "No database connection.\n");
    exit(1);
}

$sqlPath = __DIR__ . '/delete_lab_12.sql';
if (!is_readable($sqlPath)) {
    fwrite(STDERR, "Cannot read: $sqlPath\n");
    exit(1);
}

$sql = file_get_contents($sqlPath);
$sql = preg_replace('/^\s*USE\s+ctf_platform\s*;/im', '', $sql);

if (!$conn->multi_query($sql)) {
    fwrite(STDERR, 'SQL error: ' . $conn->error . "\n");
    exit(1);
}

do {
    if ($result = $conn->store_result()) {
        $result->free();
    }
} while ($conn->more_results() && $conn->next_result());

echo "delete_lab_12.sql completed OK.\n";
exit(0);
