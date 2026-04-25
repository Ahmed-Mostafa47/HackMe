<?php
declare(strict_types=1);

/**
 * White-box Lab #18: broken access — admin panel reachable / role set from URL (?role=admin).
 * Sources can be served from Training Labs (BA) or from stubs when the path is unset.
 */
function hackme_whitebox_lab18_stub_source(): string
{
    return <<<'PHP'
<?php
session_start();
$_SESSION['role'] = $_GET['role'];
if (($_SESSION['role'] ?? '') === 'admin') {
    echo 'ADMIN_PANEL';
} else {
    echo 'guest area';
}
PHP;
}

/**
 * Embedded sources per path when LABS_BASE_PATH is missing or files are absent.
 */
function hackme_whitebox_lab18_stub_for_relative_path(string $rel): string
{
    $norm = str_replace('\\', '/', trim($rel, " \t\n\r\0\x0B"));
    $norm = ltrim($norm, '/');

    if ($norm === 'public/admin_panel.php') {
        return hackme_whitebox_lab18_stub_source();
    }
    if ($norm === 'public/index.php') {
        return <<<'PHP'
<?php
declare(strict_types=1);
session_start();
header('Content-Type: text/plain; charset=utf-8');
if (($_SESSION['role'] ?? '') === 'admin') {
    echo "Admin UI is in admin_panel.php.\n";
} else {
    echo "Guest view.\n";
}
PHP;
    }
    if ($norm === 'includes/auth_bootstrap.php') {
        return <<<'PHP'
<?php
declare(strict_types=1);
/**
 * Shared bootstrap for pages in this lab.
 * Privileged routing is implemented under public/.
 */
PHP;
    }

    return "<?php\n// Lab bundle file: {$norm}\n";
}

function hackme_whitebox_lab18_meta(): array
{
    return [
        'version' => 1,
        'verify_profile' => 'lab18_admin_role_request',
        'files' => [
            [
                'id' => 'admin_panel',
                'display_name' => 'admin_panel.php',
                'relative_path' => 'public/admin_panel.php',
            ],
            [
                'id' => 'index',
                'display_name' => 'index.php',
                'relative_path' => 'public/index.php',
            ],
            [
                'id' => 'auth_bootstrap',
                'display_name' => 'auth_bootstrap.php',
                'relative_path' => 'includes/auth_bootstrap.php',
            ],
        ],
    ];
}

function hackme_whitebox_lab18_meta_json(): string
{
    return json_encode(hackme_whitebox_lab18_meta(), JSON_UNESCAPED_SLASHES);
}
