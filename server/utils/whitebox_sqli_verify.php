<?php
declare(strict_types=1);

/**
 * Static + CLI syntax verification for Lab 1 (SQLi in login.php).
 * Does not execute application code against a real DB — avoids unsafe eval.
 */
function whitebox_find_php_cli(): string
{
    $env = getenv('HACKME_PHP_CLI');
    if (is_string($env) && $env !== '' && is_executable($env)) {
        return $env;
    }
    if (defined('PHP_BINARY') && PHP_BINARY !== '' && stripos(PHP_BINARY, 'php') !== false) {
        return PHP_BINARY;
    }
    return 'php';
}

function whitebox_php_lint(string $absPath): array
{
    $php = whitebox_find_php_cli();
    $cmd = escapeshellarg($php) . ' -l ' . escapeshellarg($absPath) . ' 2>&1';
    $out = [];
    $code = 1;
    @exec($cmd, $out, $code);
    $text = trim(implode("\n", $out));
    if ($code !== 0) {
        return ['ok' => false, 'message' => 'PHP syntax check failed: ' . ($text !== '' ? $text : 'invalid PHP')];
    }
    return ['ok' => true, 'message' => ''];
}

function whitebox_sqli_concat_still_present(string $src): bool
{
    if (preg_match('/\$query\s*=\s*"[^"]*\$username/m', $src)) {
        return true;
    }
    if (preg_match("/\$query\s*=\s*'[^']*\$username/m", $src)) {
        return true;
    }
    if (preg_match('/\$query\s*=\s*"[^"]*\$password/m', $src)) {
        return true;
    }
    if (preg_match("/\$query\s*=\s*'[^']*\$password/m", $src)) {
        return true;
    }
    if (preg_match('/->query\s*\(\s*"\s*SELECT[^"]*\$username/mi', $src)) {
        return true;
    }
    if (preg_match("/->query\s*\(\s*'\s*SELECT[^']*\$username/mi", $src)) {
        return true;
    }
    return false;
}

function whitebox_sqli_safe_fix_present(string $src): bool
{
    if (stripos($src, 'prepare') !== false && preg_match('/bind_param\s*\(/i', $src)) {
        return true;
    }
    if (preg_match('/prepare\s*\([^)]+\)[\s\S]{0,4000}bind(?:Value|Param)\s*\(/i', $src)) {
        return true;
    }
    return false;
}

/**
 * @param array<int,string> $lines 0-indexed lines (without trailing newline split)
 */
function whitebox_lab1_line_is_vulnerable_fingerprint(string $line): bool
{
    $t = trim($line);
    if ($t === '') {
        return false;
    }
    if (strpos($t, '$query') === false) {
        return false;
    }
    if (stripos($t, 'username') === false) {
        return false;
    }
    if (strpos($t, '$username') === false) {
        return false;
    }
    return true;
}

/**
 * @return array{ok:bool,message:string,patched:string}
 */
function whitebox_lab1_apply_and_verify(string $original, int $line1Based, string $replacementLine): array
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
    if (!whitebox_lab1_line_is_vulnerable_fingerprint($current)) {
        return ['ok' => false, 'message' => 'This line is not the vulnerable query assignment. Inspect the highlighted line.', 'patched' => ''];
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

    if (whitebox_sqli_concat_still_present($patched)) {
        return ['ok' => false, 'message' => 'Unsafe pattern: user input still appears concatenated into the SQL string.', 'patched' => $patched];
    }
    if (!whitebox_sqli_safe_fix_present($patched)) {
        return ['ok' => false, 'message' => 'Fix not accepted: use prepared statements (prepare + bind_param) or equivalent bound parameters.', 'patched' => $patched];
    }

    $tmp = tempnam(sys_get_temp_dir(), 'wb_lab1_');
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
