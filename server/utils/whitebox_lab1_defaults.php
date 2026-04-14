<?php
declare(strict_types=1);

/**
 * Built-in white-box bundle for SQL Lab #1 when DB column whitebox_files_ref is empty or not migrated.
 */
function hackme_whitebox_lab1_meta(): array
{
    return [
        'version' => 1,
        'verify_profile' => 'lab1_sqli_login',
        'files' => [
            [
                'id' => 'login',
                'display_name' => 'login.php',
                'relative_path' => 'api/login.php',
                'vulnerable_line' => 10,
            ],
        ],
    ];
}

function hackme_whitebox_lab1_meta_json(): string
{
    return json_encode(hackme_whitebox_lab1_meta(), JSON_UNESCAPED_SLASHES);
}

function hackme_path_is_under_lab_root(string $absolutePath, string $labRoot): bool
{
    $p = strtolower(str_replace('\\', '/', $absolutePath));
    $r = strtolower(str_replace('\\', '/', rtrim($labRoot, '\\/')));
    return $p === $r || strncmp($p, $r . '/', strlen($r) + 1) === 0;
}
