<?php
declare(strict_types=1);

require_once __DIR__ . '/lab_zip_upload.php';

/**
 * @param PdoMysqliShim $conn
 */
function hackme_ensure_lab_submission_requests_zip_columns($conn): void
{
    $c = $conn->query("SHOW COLUMNS FROM lab_submission_requests LIKE 'zip_package_path'");
    if ($c && $c->num_rows === 0) {
        $conn->query(
            'ALTER TABLE lab_submission_requests ADD COLUMN zip_package_path VARCHAR(512) NULL DEFAULT NULL AFTER solution'
        );
    }
    $c2 = $conn->query("SHOW COLUMNS FROM lab_submission_requests LIKE 'zip_original_name'");
    if ($c2 && $c2->num_rows === 0) {
        $conn->query(
            'ALTER TABLE lab_submission_requests ADD COLUMN zip_original_name VARCHAR(255) NULL DEFAULT NULL AFTER zip_package_path'
        );
    }
}

function hackme_copy_directory_recursive(string $src, string $dst): bool
{
    if (!is_dir($src)) {
        return false;
    }
    if (!hackme_ensure_dir($dst)) {
        return false;
    }
    $inner = scandir($src);
    if (!is_array($inner)) {
        return false;
    }
    foreach ($inner as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $from = $src . DIRECTORY_SEPARATOR . $item;
        $to = $dst . DIRECTORY_SEPARATOR . $item;
        if (is_dir($from)) {
            if (!hackme_copy_directory_recursive($from, $to)) {
                return false;
            }
        } elseif (is_file($from)) {
            if (!@copy($from, $to)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Copy validated staged ZIP extract into permanent submission folder.
 * Returns relative path under hackme_lab_storage_root() e.g. "submissions/12", or null on failure.
 */
function hackme_copy_staged_extract_to_submission(string $token, int $submissionId): ?string
{
    if ($submissionId < 1 || !preg_match('/^[a-f0-9]{32}$/', $token)) {
        return null;
    }
    $m = hackme_load_staged_manifest($token);
    if (!$m || empty($m['extract_dir']) || !is_dir($m['extract_dir'])) {
        return null;
    }
    $extract = rtrim((string) $m['extract_dir'], '/\\');
    $root = hackme_lab_storage_root() . DIRECTORY_SEPARATOR . 'submissions';
    if (!hackme_ensure_dir($root)) {
        return null;
    }
    $dest = $root . DIRECTORY_SEPARATOR . $submissionId;
    if (is_dir($dest)) {
        hackme_recursive_remove($dest);
    }
    if (!hackme_ensure_dir($dest)) {
        return null;
    }
    $items = scandir($extract);
    if (!is_array($items)) {
        return null;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $from = $extract . DIRECTORY_SEPARATOR . $item;
        $to = $dest . DIRECTORY_SEPARATOR . $item;
        if (is_dir($from)) {
            if (!hackme_copy_directory_recursive($from, $to)) {
                return null;
            }
        } elseif (is_file($from)) {
            if (!@copy($from, $to)) {
                return null;
            }
        }
    }

    return 'submissions/' . $submissionId;
}

/**
 * Build a ZIP archive from a directory tree; returns true on success.
 */
function hackme_zip_directory_to_file(string $sourceRoot, string $outZipPath): bool
{
    $real = realpath($sourceRoot);
    if ($real === false || !is_dir($real)) {
        return false;
    }
    $real = rtrim($real, '/\\');
    $zip = new ZipArchive();
    if ($zip->open($outZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        return false;
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($real, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($it as $file) {
        if (!$file instanceof SplFileInfo || !$file->isFile()) {
            continue;
        }
        $full = $file->getPathname();
        $local = substr($full, strlen($real) + 1);
        if ($local === false || $local === '') {
            continue;
        }
        $zip->addFile($full, str_replace('\\', '/', $local));
    }

    return $zip->close();
}
