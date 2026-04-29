<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils/db_connect.php';

$sqlPath = __DIR__ . '/migrate_labs_db_only.sql';
$sql = @file_get_contents($sqlPath);
if ($sql === false || trim($sql) === '') {
    fwrite(STDERR, "Failed to read migration SQL file.\n");
    exit(1);
}

$ok = hackme_pdo_drain_multistatement($pdo, $sql);
if (!$ok) {
    fwrite(STDERR, "Migration execution failed.\n");
    exit(2);
}

fwrite(STDOUT, "Migration executed successfully.\n");
