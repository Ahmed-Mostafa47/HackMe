<?php
declare(strict_types=1);

function whitebox_xss_apply_patch_line(string $original, int $lineNo, string $replacement): array
{
    $lines = preg_split('/\R/', $original);
    if (!is_array($lines) || $lineNo < 1 || $lineNo > count($lines)) {
        return [false, 'Invalid target line'];
    }
    $replacementLines = preg_split('/\R/', $replacement);
    if (!is_array($replacementLines) || $replacementLines === []) {
        return [false, 'Replacement cannot be empty'];
    }
    array_splice($lines, $lineNo - 1, 1, $replacementLines);
    return [true, implode("\n", $lines)];
}

function whitebox_lab20_reflected_xss_verify(string $patched): array
{
    $hasEscaping =
        preg_match('/htmlspecialchars\s*\(/i', $patched) === 1 ||
        preg_match('/strip_tags\s*\(/i', $patched) === 1;
    $stillUnsafeEcho =
        preg_match('/echo\s+["\']?<p>Results for:\s*["\']?\s*\.\s*\$query/i', $patched) === 1;

    if (!$hasEscaping) {
        return [false, 'Fix rejected: reflected output must be escaped (e.g., htmlspecialchars).'];
    }
    if ($stillUnsafeEcho) {
        return [false, 'Fix rejected: vulnerable reflected echo pattern still present.'];
    }
    return [true, 'Reflected XSS mitigation verified.'];
}

function whitebox_lab21_dom_xss_verify(string $patched): array
{
    $unsafeSink = preg_match('/\.innerHTML\s*=/', $patched) === 1;
    $safeSink =
        preg_match('/\.textContent\s*=/', $patched) === 1 ||
        preg_match('/createTextNode\s*\(/', $patched) === 1;
    if ($unsafeSink) {
        return [false, 'Fix rejected: innerHTML assignment remains in DOM sink.'];
    }
    if (!$safeSink) {
        return [false, 'Fix rejected: replace sink with textContent/createTextNode.'];
    }
    return [true, 'DOM XSS mitigation verified.'];
}

function whitebox_xss_apply_and_verify(int $labId, string $original, int $lineNo, string $replacement): array
{
    [$ok, $patchedOrMessage] = whitebox_xss_apply_patch_line($original, $lineNo, $replacement);
    if (!$ok) {
        return ['ok' => false, 'message' => (string) $patchedOrMessage];
    }
    $patched = (string) $patchedOrMessage;

    if ($labId === 21) {
        [$vOk, $vMsg] = whitebox_lab21_dom_xss_verify($patched);
        return ['ok' => $vOk, 'message' => $vMsg];
    }
    [$vOk, $vMsg] = whitebox_lab20_reflected_xss_verify($patched);
    return ['ok' => $vOk, 'message' => $vMsg];
}
