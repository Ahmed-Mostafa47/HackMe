<?php
declare(strict_types=1);

require_once __DIR__ . '/whitebox_sqli_verify.php';

/**
 * Verify Lab 19 patch: stop using URL user_id for horizontal access; bind reads to session viewer + 403.
 *
 * @return array{ok:bool,message:string,patched:string}
 */
function whitebox_lab19_apply_and_verify(string $original, int $line1Based, string $replacementLine): array
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
    if (!whitebox_lab19_line_is_vulnerable_fingerprint($current)) {
        $vulnIdx = null;
        foreach ($lines as $i => $ln) {
            if (whitebox_lab19_line_is_vulnerable_fingerprint($ln)) {
                $vulnIdx = $i;
                break;
            }
        }
        if ($vulnIdx !== null && abs($vulnIdx - $idx) <= 2) {
            $idx = $vulnIdx;
            $current = $lines[$idx];
        }
    }
    if (!whitebox_lab19_line_is_vulnerable_fingerprint($current)) {
        return [
            'ok' => false,
            'message' => 'This line is not the vulnerable IDOR sink. Find the assignment that takes user_id from $_GET or $_REQUEST and replace it with a session-bound check.',
            'patched' => '',
        ];
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

    if (whitebox_lab19_idor_from_request_still($patched)) {
        return ['ok' => false, 'message' => 'Unsafe: profile lookup must not trust user_id from $_GET / $_REQUEST alone.', 'patched' => $patched];
    }
    if (!whitebox_lab19_uses_session_viewer($patched)) {
        return ['ok' => false, 'message' => 'Fix not accepted: use $_SESSION[\'user_id\'] (or equivalent) as the authoritative viewer id for the profile lookup.', 'patched' => $patched];
    }
    if (!whitebox_lab19_has_403_gate($patched)) {
        return ['ok' => false, 'message' => 'Fix not accepted: add http_response_code(403) when the requested profile does not match the logged-in user.', 'patched' => $patched];
    }
    if (strpos($patched, 'PROFILE_SECRET_ALICE') === false) {
        return ['ok' => false, 'message' => 'Keep the existing profile output markers (PROFILE_SECRET_*) for this exercise.', 'patched' => $patched];
    }

    $tmp = tempnam(sys_get_temp_dir(), 'wb_lab19_');
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

    return ['ok' => true, 'message' => 'IDOR mitigated: viewer-bound id + 403 on mismatch.', 'patched' => $patched];
}

function whitebox_lab19_line_is_vulnerable_fingerprint(string $line): bool
{
    return (bool) preg_match(
        '/\$[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*\(int\)\s*\(\s*\$_(?:GET|REQUEST)\s*\[\s*[\'"]user_id[\'"]\s*\]/',
        $line
    );
}

function whitebox_lab19_idor_from_request_still(string $src): bool
{
    if (preg_match('/\$_GET\s*\[\s*[\'"]user_id[\'"]\s*\]/', $src)) {
        return true;
    }
    if (preg_match('/\$_REQUEST\s*\[\s*[\'"]user_id[\'"]\s*\]/', $src)) {
        return true;
    }

    return false;
}

function whitebox_lab19_uses_session_viewer(string $src): bool
{
    return (bool) preg_match('/\$_SESSION\s*\[\s*[\'"]user_id[\'"]\s*\]/', $src);
}

function whitebox_lab19_has_403_gate(string $src): bool
{
    return (bool) preg_match('/http_response_code\s*\(\s*403\s*\)/', $src);
}
