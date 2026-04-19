<?php
/**
 * CLI: apply patch_lab18_whitebox_bundle.sql (DB metadata + drop hints for lab 18).
 * Usage: C:\xampp\php\php.exe server/sql/run_patch_lab18.php
 */
declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/utils/db_connect.php';

if (!isset($conn) || !$conn instanceof mysqli) {
    fwrite(STDERR, "No database connection.\n");
    exit(1);
}

$sqlPath = __DIR__ . '/patch_lab18_whitebox_bundle.sql';
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

echo "patch_lab18_whitebox_bundle.sql completed OK.\n";
exit(0);
