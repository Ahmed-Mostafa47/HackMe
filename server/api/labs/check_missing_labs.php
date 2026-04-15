<?php
declare(strict_types=1);

/**
 * Validates that every lab_id in LABS_REGISTRY has a row in the labs table.
 * Production scoring must not rely on labs that only exist in code fallbacks.
 *
 * CLI: php server/api/labs/check_missing_labs.php [--json]
 * Exit code: 0 if no registry labs are missing from DB, 1 otherwise.
 */

$wantJson = in_array('--json', $argv ?? [], true);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "This script is intended for CLI only:\n  php " . __FILE__ . " [--json]\n";
    exit(1);
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
} catch (Throwable $e) {
    fwrite(STDERR, "Load error: " . $e->getMessage() . "\n");
    exit(2);
}

if (!isset($conn) || !$conn) {
    fwrite(STDERR, "Database connection failed.\n");
    exit(2);
}

$registry = $GLOBALS['LABS_REGISTRY'] ?? [];
if (!is_array($registry)) {
    fwrite(STDERR, "LABS_REGISTRY is not an array.\n");
    exit(2);
}

$registryIds = [];
foreach ($registry as $entry) {
    if (!is_array($entry)) {
        continue;
    }
    $id = (int) ($entry['lab_id'] ?? 0);
    if ($id > 0) {
        $registryIds[$id] = true;
    }
}
$registryIdList = array_keys($registryIds);
sort($registryIdList, SORT_NUMERIC);

$dbIds = [];
$dbRes = $conn->query('SELECT lab_id FROM labs');
if ($dbRes) {
    while ($row = $dbRes->fetch_assoc()) {
        $dbIds[(int) ($row['lab_id'] ?? 0)] = true;
    }
}

$missingInDb = [];
foreach ($registryIdList as $id) {
    if (!isset($dbIds[$id])) {
        $missingInDb[] = $id;
    }
}

$inDbNotInRegistry = [];
foreach (array_keys($dbIds) as $id) {
    if ($id < 1) {
        continue;
    }
    if (!isset($registryIds[$id])) {
        $inDbNotInRegistry[] = $id;
    }
}
sort($inDbNotInRegistry, SORT_NUMERIC);

$report = [
    'registry_lab_ids' => $registryIdList,
    'missing_in_db' => $missingInDb,
    'in_db_not_in_registry' => $inDbNotInRegistry,
    'incomplete_setup' => count($missingInDb) > 0,
    'summary' => count($missingInDb) === 0
        ? 'All LABS_REGISTRY lab_ids exist in the labs table.'
        : 'One or more registry labs are missing from the labs table (incomplete setup for production).',
];

if ($wantJson) {
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
} else {
    echo $report['summary'] . "\n\n";
    echo 'LABS_REGISTRY lab_ids: ' . implode(', ', $registryIdList) . "\n";
    if ($missingInDb !== []) {
        echo "\nMISSING IN DB (must migrate / insert labs rows): " . implode(', ', $missingInDb) . "\n";
    } else {
        echo "\nMissing in DB: (none)\n";
    }
    if ($inDbNotInRegistry !== []) {
        echo "\nIn DB but not in LABS_REGISTRY (informational): " . implode(', ', $inDbNotInRegistry) . "\n";
    }
}

exit($report['incomplete_setup'] ? 1 : 0);
