<?php
declare(strict_types=1);

require_once __DIR__ . '/whitebox_sqli_verify.php';

/**
 * Verify Lab 18 patch: remove client-controlled role assignment; keep PHP valid.
 *
 * @return array{ok:bool,message:string,patched:string}
 */
function whitebox_lab18_apply_and_verify(string $original, int $line1Based, string $replacementLine): array
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
    if (!whitebox_lab18_line_is_vulnerable_fingerprint($current)) {
        $vulnIdx = null;
        foreach ($lines as $i => $ln) {
            if (whitebox_lab18_line_is_vulnerable_fingerprint($ln)) {
                $vulnIdx = $i;
                break;
            }
        }
        if ($vulnIdx !== null && abs($vulnIdx - $idx) <= 2) {
            $idx = $vulnIdx;
            $current = $lines[$idx];
        }
    }
    if (!whitebox_lab18_line_is_vulnerable_fingerprint($current)) {
        return [
            'ok' => false,
            'message' => 'This line is not the vulnerable role assignment. Find the line in admin_panel.php that assigns $_SESSION[\'role\'] from $_GET / $_REQUEST / $_POST and replace it with a safe patch.',
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

    if (whitebox_lab18_role_still_from_request($patched)) {
        return ['ok' => false, 'message' => 'Unsafe: session role must not be taken from $_GET / $_REQUEST / $_POST.', 'patched' => $patched];
    }
    if (!whitebox_lab18_has_server_side_admin_gate($patched)) {
        return ['ok' => false, 'message' => 'Fix not accepted: enforce admin with a server-side check before ADMIN_PANEL (e.g. if (($_SESSION[\'role\'] ?? \'\') !== \'admin\') { http_response_code(403); exit; } or equivalent).', 'patched' => $patched];
    }

    $tmp = tempnam(sys_get_temp_dir(), 'wb_lab18_');
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

    return ['ok' => true, 'message' => 'Access control fixed (no role from URL + admin gate before panel).', 'patched' => $patched];
}

function whitebox_lab18_line_is_vulnerable_fingerprint(string $line): bool
{
    return (bool) preg_match(
        '/\$_SESSION\s*\[\s*[\'"]role[\'"]\s*\]\s*=\s*\$_(?:GET|REQUEST|POST)\s*\[\s*[\'"]role[\'"]\s*\]/',
        $line
    );
}

function whitebox_lab18_role_still_from_request(string $src): bool
{
    if (preg_match('/\$_SESSION\s*\[\s*[\'"]role[\'"]\s*\]\s*=\s*\$_GET\b/', $src)) {
        return true;
    }
    if (preg_match('/\$_SESSION\s*\[\s*[\'"]role[\'"]\s*\]\s*=\s*\$_REQUEST\b/', $src)) {
        return true;
    }
    if (preg_match('/\$_SESSION\s*\[\s*[\'"]role[\'"]\s*\]\s*=\s*\$_POST\b/', $src)) {
        return true;
    }
    return false;
}

/**
 * Require an explicit server-side denial before showing admin content.
 */
function whitebox_lab18_has_server_side_admin_gate(string $src): bool
{
    if (strpos($src, 'ADMIN_PANEL') === false) {
        return false;
    }
    if (preg_match('/\$_GET\s*\[\s*[\'"]role[\'"]\s*\]/', $src)) {
        return false;
    }
    if (preg_match('/\$_REQUEST\s*\[\s*[\'"]role[\'"]\s*\]/', $src)) {
        return false;
    }
    if (preg_match('/\$_POST\s*\[\s*[\'"]role[\'"]\s*\]/', $src)) {
        return false;
    }
    return (bool) (
        preg_match('/http_response_code\s*\(\s*403\s*\)/', $src)
        && preg_match('/\$_SESSION\s*\[\s*[\'"]role[\'"]\s*\]/', $src)
        && preg_match('/!==\s*[\'"]admin[\'"]|!=\s*[\'"]admin[\'"]/', $src)
    );
}
