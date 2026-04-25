<?php
declare(strict_types=1);

require_once __DIR__ . '/whitebox_sqli_verify.php';

/**
 * Academy member.php SQLi: $sql = "... WHERE user_id = '" . $id . "'";
 */
function whitebox_academy_member_line_is_vulnerable_fingerprint(string $line): bool
{
    $t = trim($line);
    if ($t === '') return false;
    if (strpos($t, '$sql') === false) return false;
    if (stripos($t, 'academy_users') === false) return false;
    if (stripos($t, 'user_id') === false) return false;
    if (strpos($t, "'.\"") !== false) return true; // rare formatting
    if (strpos($t, "'.") !== false && strpos($t, '$id') !== false) return true;
    if (strpos($t, " . \$id") !== false) return true;
    if (strpos($t, " . $id") !== false) return true;
    return strpos($t, '$id') !== false && (strpos($t, " . ") !== false || strpos($t, "'.") !== false);
}

function whitebox_academy_concat_still_present(string $src): bool
{
    // Detect the academy member vulnerable pattern lingering.
    return (bool) preg_match('/SELECT\s+user_name,\s*password,\s*role,\s*email\s+FROM\s+academy_users\s+WHERE\s+user_id\s*=\s*\'\s*"\s*\\.\s*\\$id/mi', $src)
        || (bool) preg_match('/FROM\s+academy_users\s+WHERE\s+user_id\s*=\s*\'\s*"\s*\\.\s*\\$id/mi', $src)
        || (bool) preg_match('/WHERE\s+user_id\s*=\s*\'\s*"\s*\\.\s*\\$id/mi', $src)
        || (bool) preg_match('/WHERE\s+user_id\s*=\s*\'\s*"\s*\\.\s*\\$id/mi', $src);
}

/**
 * @return array{ok:bool,message:string,patched:string}
 */
function whitebox_academy_apply_and_verify_member(string $original, int $line1Based, string $replacementLine): array
{
    $lines = preg_split("/\r\n|\n|\r/", $original);
    if ($lines === false) {
        return ['ok' => false, 'message' => 'Invalid source encoding.', 'patched' => ''];
    }
    if ($line1Based < 1 || $line1Based > count($lines)) {
        return ['ok' => false, 'message' => 'Line number is out of range for this file.', 'patched' => ''];
    }

    $idx = $line1Based - 1;
    $current = $lines[$idx];
    if (!whitebox_academy_member_line_is_vulnerable_fingerprint($current)) {
        return ['ok' => false, 'message' => 'This line is not the vulnerable SQL assignment.', 'patched' => ''];
    }

    $replacementLines = preg_split("/\r\n|\n|\r/", $replacementLine);
    if ($replacementLines === false) {
        return ['ok' => false, 'message' => 'Invalid replacement.', 'patched' => ''];
    }
    array_splice($lines, $idx, 1, $replacementLines);
    $patched = implode("\n", $lines);
    if (substr($original, -1) === "\n" && substr($patched, -1) !== "\n") {
        $patched .= "\n";
    }

    // Must remove concat and must include prepared statement/bound parameters.
    if (stripos($patched, 'academy_users') !== false && (strpos($patched, "'.") !== false) && strpos($patched, '$id') !== false) {
        return ['ok' => false, 'message' => 'Unsafe pattern: user input still appears concatenated into the SQL string.', 'patched' => $patched];
    }
    if (!whitebox_sqli_safe_fix_present($patched)) {
        return ['ok' => false, 'message' => 'Fix not accepted: use prepared statements (prepare + bind_param) or equivalent bound parameters.', 'patched' => $patched];
    }

    $tmp = tempnam(sys_get_temp_dir(), 'wb_acad_');
    if ($tmp === false) {
        return ['ok' => false, 'message' => 'Server could not allocate temp file for syntax check.', 'patched' => $patched];
    }
    $tmpPhp = $tmp . '.php';
    if (!@rename($tmp, $tmpPhp)) {
        @unlink($tmp);
        $tmpPhp = $tmp;
    }
    file_put_contents($tmpPhp, $patched);
    $lint = whitebox_php_lint($tmpPhp);
    @unlink($tmpPhp);

    if (!$lint['ok']) {
        return ['ok' => false, 'message' => $lint['message'], 'patched' => $patched];
    }

    return ['ok' => true, 'message' => 'Vulnerability mitigated (syntax OK + safe query pattern).', 'patched' => $patched];
}

