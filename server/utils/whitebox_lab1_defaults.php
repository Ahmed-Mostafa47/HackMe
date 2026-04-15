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

/**
 * Minimal login.php used when LABS_BASE_PATH/SQL tree is missing (same rules as Training Labs file).
 * Vulnerable concatenated query is on line 10 (matches whitebox_files_ref vulnerable_line).
 */
function hackme_whitebox_lab1_stub_login_source(): string
{
    return <<<'PHP'
<?php
//
//
//
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';
$mysqli = new mysqli('127.0.0.1', 'u', 'p', 'db');
//

$query = "SELECT * FROM users WHERE username = '$username' AND password = '$password' LIMIT 1";
$result = $mysqli->query($query);
PHP;
}

function hackme_path_is_under_lab_root(string $absolutePath, string $labRoot): bool
{
    $p = strtolower(str_replace('\\', '/', $absolutePath));
    $r = strtolower(str_replace('\\', '/', rtrim($labRoot, '\\/')));
    return $p === $r || strncmp($p, $r . '/', strlen($r) + 1) === 0;
}
