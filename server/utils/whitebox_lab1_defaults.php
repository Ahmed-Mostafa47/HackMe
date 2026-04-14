<?php
declare(strict_types=1);

/**
 * Payload marker stored in submissions.payload_text for white-box SQL completion (must match lab id split).
 */
function hackme_whitebox_sql_lab_id(): int
{
    return defined('HACKME_WHITEBOX_SQL_LAB_ID') ? (int) HACKME_WHITEBOX_SQL_LAB_ID : 11;
}

function hackme_whitebox_sql_payload_mark(): string
{
    return 'whitebox_sqli_lab' . hackme_whitebox_sql_lab_id();
}

/**
 * When the `labs` row for the SQL white-box id is missing or not published, APIs still return data so the UI works.
 *
 * @return array{lab_id:int,title:string,description:string,icon:string,port:?int,launch_path:string,labtype_id:int,difficulty:string,points_total:int,is_published:int,visibility:string,has_solution:int}
 */
function hackme_whitebox_sql_fallback_lab_row(): array
{
    $id = hackme_whitebox_sql_lab_id();

    return [
        'lab_id' => $id,
        'title' => 'SQL_INJECTION_WHITEBOX',
        'description' => 'White-box: review and patch api/login.php in the Training Labs SQL folder. Run server/sql/migrate_lab11_split_whitebox.sql on MySQL to register this lab for leaderboard points.',
        'icon' => '💉',
        'port' => null,
        'launch_path' => '',
        'labtype_id' => 1,
        'difficulty' => 'medium',
        'points_total' => 100,
        'is_published' => 1,
        'visibility' => 'public',
        'has_solution' => 0,
    ];
}

/**
 * Built-in white-box bundle for SQL white-box lab when DB column whitebox_files_ref is empty or not migrated.
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
