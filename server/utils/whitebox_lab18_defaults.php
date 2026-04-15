<?php
declare(strict_types=1);

/**
 * White-box Lab #18: broken access — admin panel reachable / role set from URL (?role=admin).
 * Sources can be served from Training Labs (BA) or from this stub when the file is missing.
 */
function hackme_whitebox_lab18_stub_source(): string
{
    // One highlighted vulnerable line; user replaces it with a safe patch.
    return <<<'PHP'
<?php
session_start();
// BUG: role must never be taken from the request without proper authentication.
$_SESSION['role'] = $_GET['role'];
if (($_SESSION['role'] ?? '') === 'admin') {
    echo 'ADMIN_PANEL';
} else {
    echo 'guest area';
}
PHP;
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
                'vulnerable_line' => 4,
            ],
        ],
    ];
}

function hackme_whitebox_lab18_meta_json(): string
{
    return json_encode(hackme_whitebox_lab18_meta(), JSON_UNESCAPED_SLASHES);
}
