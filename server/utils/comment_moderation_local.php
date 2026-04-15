<?php
declare(strict_types=1);

/**
 * Offline / always-on profanity & abuse heuristic (Arabic + English).
 * Used together with OpenAI / Perspective so comments are still filtered without API keys.
 */

/**
 * @return string[] words/phrases (lowercase); Arabic entries already normalized form
 */
function hackme_local_moderation_blocklist(): array
{
    static $list = null;
    if ($list !== null) {
        return $list;
    }

    $en = [
        'fuck', 'fucker', 'fucking', 'fuk', 'fck', 'fukk', 'motherfuck', 'mfucker',
        'shit', 'sh1t', 'bullshit', 'bitch', 'biatch', 'bastard', 'asshole', 'dickhead',
        'dick', 'cock', 'cunt', 'pussy', 'slut', 'whore', 'retard', 'nigger', 'nigga',
        'faggot', 'fag', 'rape', 'kill yourself', 'kys', 'stfu', 'wtf', 'suck my',
    ];

    // Avoid bare "كس" alone (appears inside مكسور). Use كسم/كسمك/كسك etc.
    $ar = [
        'كسم', 'كسمك', 'كسك', 'كس ام', 'كس أم', 'كسامك', 'كسختك', 'كس امك', 'كس أمك',
        'خول', 'عرص', 'منيك', 'منيوك', 'قحبة', 'قحاب', 'شرموطة', 'شرموط',
        'زبي', 'زبك', 'طيزك', 'عاهرة', 'يلعن', 'ابن الكلب',
        'ابن الزنا', 'حرامي', 'يخربيت', 'تفو', 'اللعنة', 'خرا', 'زفت',
        'وسخة', 'يلعنك', 'لعنك', 'ياعرص', 'ياخول', 'يا خول', 'يا عرص',
    ];

    $list = array_merge($en, $ar);
    return $list;
}

function hackme_normalize_for_local_moderation(string $text): string
{
    $t = $text;
    $t = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $t);
    $t = mb_strtolower($t, 'UTF-8');
    $t = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $t);
    $repl = ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي'];
    foreach ($repl as $from => $to) {
        $t = str_replace($from, $to, $t);
    }
    $t = str_replace('ـ', '', $t);
    $t = preg_replace('/\s+/u', ' ', $t);

    return trim($t);
}

/**
 * True if text matches local blocklist or English regex patterns.
 */
function hackme_local_profanity_flagged(string $text): bool
{
    $trim = trim($text);
    if ($trim === '') {
        return false;
    }

    $norm = hackme_normalize_for_local_moderation($text);
    $compact = preg_replace('/\s+/u', '', $norm);
    $tokens = preg_split('/[\s,.;:!?،؛()[\]{}]+/u', $norm, -1, PREG_SPLIT_NO_EMPTY);

    foreach (hackme_local_moderation_blocklist() as $word) {
        $w = trim(mb_strtolower((string) $word, 'UTF-8'));
        if ($w === '') {
            continue;
        }
        $wLen = mb_strlen($w, 'UTF-8');
        // Short tokens: exact match on a word token only (avoid substring false positives)
        if ($wLen <= 3 && preg_match('/^[a-z0-9]+$/i', $w)) {
            foreach ($tokens as $tok) {
                if (mb_strtolower($tok, 'UTF-8') === $w) {
                    return true;
                }
            }
            continue;
        }
        // Phrases / long words: substring in full text or compact (spacing tricks)
        if (mb_strpos($norm, $w, 0, 'UTF-8') !== false) {
            return true;
        }
        $wCompact = preg_replace('/\s+/u', '', $w);
        if ($wCompact !== '' && mb_strpos($compact, $wCompact, 0, 'UTF-8') !== false) {
            return true;
        }
    }

    // English obfuscation: f u c k, f*ck, etc.
    $ascii = preg_replace('/[^\x20-\x7E]/u', '', $norm);
    $asciiCompact = preg_replace('/[\s_\-.*]+/', '', $ascii);
    if (preg_match('/(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|a+s+s+h+o+l+e+|d+i+c+k+|c+u+n+t+)/i', $asciiCompact)) {
        return true;
    }

    return false;
}
