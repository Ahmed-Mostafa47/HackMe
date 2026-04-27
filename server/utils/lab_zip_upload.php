<?php
declare(strict_types=1);

require_once __DIR__ . '/pdo_mysqli_shim.php';

function hackme_lab_storage_root(): string
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'labs';
}

function hackme_lab_storage_tmp_root(): string
{
    return hackme_lab_storage_root() . DIRECTORY_SEPARATOR . '_tmp';
}

function hackme_ensure_dir(string $path): bool
{
    if (is_dir($path)) {
        return true;
    }
    return @mkdir($path, 0775, true);
}

function hackme_normalize_zip_path(string $name): string
{
    $name = str_replace('\\', '/', $name);
    $name = preg_replace('/\/+/', '/', $name) ?? '';
    return trim($name, '/');
}

function hackme_is_safe_zip_entry(string $path): bool
{
    if ($path === '') {
        return false;
    }
    if (strpos($path, "\0") !== false) {
        return false;
    }
    if (preg_match('/^[A-Za-z]:\//', $path) === 1) {
        return false;
    }
    if (str_starts_with($path, '/')) {
        return false;
    }
    $parts = explode('/', $path);
    foreach ($parts as $part) {
        if ($part === '..') {
            return false;
        }
    }
    return true;
}

function hackme_slugify(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    if ($value === '') {
        $value = 'lab';
    }
    return substr($value, 0, 64);
}

function hackme_validate_metadata(array $meta): array
{
    $errors = [];
    $title = trim((string) ($meta['title'] ?? ''));
    $difficulty = strtolower(trim((string) ($meta['difficulty'] ?? '')));
    $category = trim((string) ($meta['category'] ?? ''));
    $type = strtolower(trim((string) ($meta['type'] ?? '')));

    if ($title === '') {
        $errors[] = 'metadata.title is required.';
    }
    if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
        $errors[] = 'metadata.difficulty must be easy/medium/hard.';
    }
    if ($category === '') {
        $errors[] = 'metadata.category is required.';
    }
    if (!in_array($type, ['whitebox', 'blackbox'], true)) {
        $errors[] = 'metadata.type must be whitebox or blackbox.';
    }

    return [
        'errors' => $errors,
        'metadata' => [
            'title' => $title,
            'difficulty' => $difficulty,
            'category' => $category,
            'type' => $type,
        ],
    ];
}

function hackme_recursive_remove(string $path): void
{
    if (!file_exists($path)) {
        return;
    }
    if (is_file($path) || is_link($path)) {
        @unlink($path);
        return;
    }
    $items = scandir($path);
    if (!is_array($items)) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        hackme_recursive_remove($path . DIRECTORY_SEPARATOR . $item);
    }
    @rmdir($path);
}

function hackme_validate_and_stage_lab_zip(string $uploadedTmpPath, int $maxBytes = 20971520, string $fallbackTitle = ''): array
{
    $errors = [];
    $warnings = [];
    $maxEntries = 500;

    if (!is_file($uploadedTmpPath) || !is_readable($uploadedTmpPath)) {
        return ['success' => false, 'errors' => ['Uploaded file is not readable.']];
    }
    $size = filesize($uploadedTmpPath);
    if ($size === false || $size < 1) {
        return ['success' => false, 'errors' => ['Uploaded ZIP is empty.']];
    }
    if ($size > $maxBytes) {
        return ['success' => false, 'errors' => ['ZIP exceeds maximum allowed size (20 MB).']];
    }

    $zip = new ZipArchive();
    if ($zip->open($uploadedTmpPath) !== true) {
        return ['success' => false, 'errors' => ['Failed to open ZIP archive.']];
    }

    if ($zip->numFiles < 1 || $zip->numFiles > $maxEntries) {
        $zip->close();
        return ['success' => false, 'errors' => ['ZIP entry count is invalid (1-500 required).']];
    }

    $hasLabFiles = false;
    $metadataRaw = '';
    $hasMetadata = false;

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        if (!is_array($stat)) {
            $errors[] = 'Invalid ZIP entry metadata.';
            continue;
        }
        $entryName = hackme_normalize_zip_path((string) ($stat['name'] ?? ''));
        if ($entryName === '' || !hackme_is_safe_zip_entry($entryName)) {
            $errors[] = 'Unsafe ZIP path detected.';
            continue;
        }

        if (str_starts_with($entryName, 'lab-files/')) {
            if (!str_ends_with($entryName, '/')) {
                $hasLabFiles = true;
            }
            $lower = strtolower(pathinfo($entryName, PATHINFO_EXTENSION));
            if ($lower !== '' && !in_array($lower, ['php', 'js', 'html', 'css', 'json', 'txt', 'md', 'sql', 'py'], true)) {
                $warnings[] = 'Potentially risky file extension inside lab-files: ' . $entryName;
            }
        }

        if ($entryName === 'metadata.json') {
            $hasMetadata = true;
            $metadataRaw = (string) $zip->getFromIndex($i);
        }
    }

    if (!$hasLabFiles) {
        $errors[] = 'Missing lab-files directory contents.';
    }

    $meta = [];
    if ($hasMetadata) {
        $meta = json_decode($metadataRaw, true);
        if (!is_array($meta)) {
            $errors[] = 'metadata.json is invalid JSON.';
            $meta = [];
        }
    } else {
        $meta = [
            'title' => trim($fallbackTitle) !== '' ? trim($fallbackTitle) : 'Uploaded Lab',
            'difficulty' => 'medium',
            'category' => 'General',
            'type' => 'whitebox',
        ];
    }
    $metaCheck = hackme_validate_metadata($meta);
    foreach ($metaCheck['errors'] as $err) {
        $errors[] = $err;
    }

    if ($errors !== []) {
        $zip->close();
        return ['success' => false, 'errors' => array_values(array_unique($errors)), 'warnings' => array_values(array_unique($warnings))];
    }

    $tmpRoot = hackme_lab_storage_tmp_root();
    if (!hackme_ensure_dir($tmpRoot)) {
        $zip->close();
        return ['success' => false, 'errors' => ['Failed to create temporary storage directory.']];
    }
    $token = bin2hex(random_bytes(16));
    $stageDir = $tmpRoot . DIRECTORY_SEPARATOR . $token;
    $extractDir = $stageDir . DIRECTORY_SEPARATOR . 'content';
    if (!hackme_ensure_dir($extractDir)) {
        $zip->close();
        return ['success' => false, 'errors' => ['Failed to create staging directory.']];
    }

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        if (!is_array($stat)) {
            continue;
        }
        $entryName = hackme_normalize_zip_path((string) ($stat['name'] ?? ''));
        if ($entryName === '' || !hackme_is_safe_zip_entry($entryName)) {
            continue;
        }
        $targetPath = $extractDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $entryName);
        if (str_ends_with($entryName, '/')) {
            hackme_ensure_dir($targetPath);
            continue;
        }
        $parent = dirname($targetPath);
        if (!hackme_ensure_dir($parent)) {
            $zip->close();
            hackme_recursive_remove($stageDir);
            return ['success' => false, 'errors' => ['Failed to create destination directory for extraction.']];
        }
        $stream = $zip->getStream((string) ($stat['name'] ?? ''));
        if ($stream === false) {
            $zip->close();
            hackme_recursive_remove($stageDir);
            return ['success' => false, 'errors' => ['Failed to read ZIP entry stream.']];
        }
        $fh = fopen($targetPath, 'wb');
        if ($fh === false) {
            fclose($stream);
            $zip->close();
            hackme_recursive_remove($stageDir);
            return ['success' => false, 'errors' => ['Failed to write extracted file.']];
        }
        stream_copy_to_stream($stream, $fh);
        fclose($fh);
        fclose($stream);
    }
    $zip->close();

    $manifest = [
        'token' => $token,
        'created_at' => time(),
        'metadata' => $metaCheck['metadata'],
        'warnings' => array_values(array_unique($warnings)),
    ];
    file_put_contents($stageDir . DIRECTORY_SEPARATOR . 'manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    return [
        'success' => true,
        'token' => $token,
        'metadata' => $metaCheck['metadata'],
        'warnings' => $manifest['warnings'],
        'validation' => [
            'required_files' => ['lab-files/'],
            'lab_files_detected' => true,
            'metadata_provided' => $hasMetadata,
            'safe_extraction' => true,
        ],
    ];
}

function hackme_load_staged_manifest(string $token): ?array
{
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return null;
    }
    $stageDir = hackme_lab_storage_tmp_root() . DIRECTORY_SEPARATOR . $token;
    $manifestPath = $stageDir . DIRECTORY_SEPARATOR . 'manifest.json';
    if (!is_file($manifestPath)) {
        return null;
    }
    $raw = file_get_contents($manifestPath);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        return null;
    }
    $data['stage_dir'] = $stageDir;
    $data['extract_dir'] = $stageDir . DIRECTORY_SEPARATOR . 'content';
    return $data;
}

function hackme_user_is_instructor_or_admin(PdoMysqliShim $conn, int $userId): bool
{
    $uid = (int) $userId;
    if ($uid < 1) {
        return false;
    }
    $sql = "
      SELECT 1
      FROM user_roles ur
      INNER JOIN roles r ON r.role_id = ur.role_id
      WHERE ur.user_id = $uid
        AND LOWER(r.name) IN ('admin','superadmin','instructor')
      LIMIT 1
    ";
    $res = $conn->query($sql);
    return $res && $res->num_rows > 0;
}
