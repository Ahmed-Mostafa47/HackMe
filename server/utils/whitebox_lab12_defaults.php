<?php
declare(strict_types=1);

/**
 * White-box lab 12: Academy SQL injection backend.
 * Users must locate the vulnerable SQL concatenation and patch it with prepared statements.
 */

function hackme_whitebox_lab12_meta(): array
{
    return [
        'version' => 1,
        'verify_profile' => 'lab10_academy_member',
        'files' => [
            ['id' => 'academy_member', 'display_name' => 'academy/member.php', 'relative_path' => 'api/academy/member.php'],
            ['id' => 'academy_users', 'display_name' => 'academy/users.php', 'relative_path' => 'api/academy/users.php'],
            ['id' => 'academy_delete_user', 'display_name' => 'academy/delete_user.php', 'relative_path' => 'api/academy/delete_user.php'],
            ['id' => 'academy_login', 'display_name' => 'academy/login.php', 'relative_path' => 'api/academy/login.php'],
            ['id' => 'academy_logout', 'display_name' => 'academy/logout.php', 'relative_path' => 'api/academy/logout.php'],
            ['id' => 'academy_config', 'display_name' => 'academy/config.php', 'relative_path' => 'api/academy/config.php'],
        ],
    ];
}

function hackme_whitebox_lab12_meta_json(): string
{
    return json_encode(hackme_whitebox_lab12_meta(), JSON_UNESCAPED_SLASHES);
}

