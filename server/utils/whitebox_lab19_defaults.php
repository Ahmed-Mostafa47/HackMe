<?php
declare(strict_types=1);

/**
 * White-box Lab #19: IDOR — profile loaded by `user_id` from the URL without binding to the logged-in viewer.
 */
function hackme_whitebox_lab19_profile_stub(): string
{
    return <<<'PHP'
<?php
session_start();
$_SESSION['user_id'] = 1;
$userId = (int)($_GET['user_id'] ?? 0);
if ($userId === 1) {
    echo 'PROFILE_SECRET_ALICE';
} elseif ($userId === 2) {
    echo 'PROFILE_SECRET_BOB';
} else {
    echo 'not found';
}
PHP;
}

function hackme_whitebox_lab19_stub_for_relative_path(string $rel): string
{
    $norm = str_replace('\\', '/', trim($rel, " \t\n\r\0\x0B"));
    $norm = ltrim($norm, '/');

    if ($norm === 'public/user_profile.php') {
        return hackme_whitebox_lab19_profile_stub();
    }
    if ($norm === 'public/lab19_entry.php') {
        return <<<'PHP'
<?php
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
echo "Entry point. Some links use ?user_id= in the query string — compare with server-side session identity.\n";
PHP;
    }
    if ($norm === 'includes/lab19_scaffold.php') {
        return <<<'PHP'
<?php
declare(strict_types=1);
/**
 * Lab scaffolding: profile responses must be scoped to the authenticated user.
 * Never trust a client-supplied object id for horizontal access without an ownership check.
 */
PHP;
    }

    return "<?php\n// Lab 19 bundle file: {$norm}\n";
}

function hackme_whitebox_lab19_meta(): array
{
    return [
        'version' => 1,
        'verify_profile' => 'lab19_idor_user_param',
        'files' => [
            [
                'id' => 'user_profile',
                'display_name' => 'user_profile.php',
                'relative_path' => 'public/user_profile.php',
            ],
            [
                'id' => 'entry',
                'display_name' => 'lab19_entry.php',
                'relative_path' => 'public/lab19_entry.php',
            ],
            [
                'id' => 'scaffold',
                'display_name' => 'lab19_scaffold.php',
                'relative_path' => 'includes/lab19_scaffold.php',
            ],
        ],
    ];
}

function hackme_whitebox_lab19_meta_json(): string
{
    return json_encode(hackme_whitebox_lab19_meta(), JSON_UNESCAPED_SLASHES);
}
