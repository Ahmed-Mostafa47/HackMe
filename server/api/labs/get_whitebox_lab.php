<?php
declare(strict_types=1);

/**
 * White-box lab: source files from Training Labs on disk + metadata from challenges.whitebox_files_ref
 * GET: lab_id, user_id (must be >= 1)
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/whitebox_lab1_defaults.php';
    require_once __DIR__ . '/../../utils/whitebox_lab12_defaults.php';
    require_once __DIR__ . '/../../utils/whitebox_lab18_defaults.php';
    require_once __DIR__ . '/../../utils/whitebox_lab19_defaults.php';
    require_once __DIR__ . '/../../utils/whitebox_xss_defaults.php';
    require_once __DIR__ . '/../../utils/lab_production_state.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error']);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

$labId = (int) ($_GET['lab_id'] ?? $_GET['labId'] ?? 0);
$userId = (int) ($_GET['user_id'] ?? $_GET['userId'] ?? 0);

if ($labId < 1 || $userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id or user_id']);
    exit;
}

$labIdEsc = (int) $labId;
$wbSqlId = hackme_whitebox_sql_lab_id();
$isSqlWb = ($labIdEsc === $wbSqlId);
$isLab12 = ($labIdEsc === 12);
$isLab18 = ($labIdEsc === 18);
$isLab19 = ($labIdEsc === 19);
$isAccessWb = ($isLab18 || $isLab19);
$isXssWb = hackme_whitebox_xss_is_supported($labIdEsc);

if (!$isSqlWb && !$isLab12 && !$isAccessWb && !$isXssWb) {
    echo json_encode([
        'success' => false,
        'message' => 'White-box API is only for configured white-box labs.',
    ]);
    exit;
}

$prodState = hackme_whitebox_production_state($conn, $labIdEsc);
$labUnregistered = !$prodState['lab_in_db'];
$setupIncomplete = $prodState['setup_incomplete'];

if ($isLab18) {
    $labRes = $conn->query("
  SELECT lab_id, title, labtype_id, description
  FROM labs
  WHERE lab_id = $labIdEsc AND is_published = 1 AND visibility = 'public'
  LIMIT 1
");
    if (!$labRes || $labRes->num_rows === 0) {
        $labRow = [
            'lab_id' => 18,
            'title' => 'Access Control Bypass',
            'labtype_id' => 1,
            'description' => 'White-box: fix admin route / session role (embedded sample if Training Labs path is unset).',
        ];
    } else {
        $labRow = $labRes->fetch_assoc();
        $labRow['labtype_id'] = 1;
        $labRow['title'] = 'Access Control Bypass';
    }
} elseif ($isLab19) {
    $labRes = $conn->query("
  SELECT lab_id, title, labtype_id, description
  FROM labs
  WHERE lab_id = $labIdEsc AND is_published = 1 AND visibility = 'public'
  LIMIT 1
");
    if (!$labRes || $labRes->num_rows === 0) {
        $labRow = [
            'lab_id' => 19,
            'title' => 'IDOR (White-box)',
            'labtype_id' => 1,
            'description' => 'White-box: profile data follows user_id in the URL — bind access to the logged-in user.',
        ];
    } else {
        $labRow = $labRes->fetch_assoc();
        $labRow['labtype_id'] = 1;
        $labRow['title'] = 'IDOR (White-box)';
    }
} elseif ($isSqlWb) {
    $labFullRes = $conn->query("
  SELECT lab_id, title, labtype_id, description
  FROM labs
  WHERE lab_id = $labIdEsc
  LIMIT 1
");
    if ($labFullRes && $labFullRes->num_rows > 0) {
        $labRow = $labFullRes->fetch_assoc();
        if (!$prodState['lab_public']) {
            error_log('[HackMe WARNING] whitebox lab_id=' . $labIdEsc . ' exists in DB but is not published/public; UI shown, scoring disabled until fixed.');
        }
    } else {
        error_log('[HackMe CRITICAL] whitebox lab_id=' . $labIdEsc . ' missing from labs table; serving UI fallback only (unregistered).');
        $labRow = hackme_whitebox_sql_fallback_lab_row();
    }
} else {
    $labRes = $conn->query("
  SELECT lab_id, title, labtype_id, description
  FROM labs
  WHERE lab_id = $labIdEsc
  LIMIT 1
");
    if ($labRes && $labRes->num_rows > 0) {
        $labRow = $labRes->fetch_assoc();
    } else {
        $labRow = hackme_whitebox_xss_fallback_lab_row($labIdEsc);
    }
}

$labRow['lab_id'] = $labIdEsc;
$labRow['labtype_id'] = 1;
if ($labIdEsc === 19) {
    $labRow['title'] = 'IDOR (White-box)';
} elseif ($labIdEsc === 20) {
    $labRow['title'] = 'Reflected XSS (White-box)';
} elseif ($labIdEsc === 21) {
    $labRow['title'] = 'DOM XSS (White-box)';
}

// White-box display: unify title/description with mapped black-box lab (lab 11 -> lab 1).
$mapped = function_exists('hackme_whitebox_of_lab_id') ? hackme_whitebox_of_lab_id($labIdEsc) : null;
if (!$isLab18 && is_int($mapped) && $mapped > 0) {
    $mid = (int) $mapped;
    $mRes = $conn->query("SELECT title, description FROM labs WHERE lab_id = $mid LIMIT 1");
    if ($mRes && $mRes->num_rows > 0) {
        $mrow = $mRes->fetch_assoc();
        $mt = trim((string) ($mrow['title'] ?? ''));
        $md = trim((string) ($mrow['description'] ?? ''));
        if ($mt !== '') {
            $labRow['title'] = $mt;
        }
        if ($md !== '') {
            $labRow['description'] = $md;
        }
    }
}

$chRes = $conn->query("
  SELECT challenge_id, title, whitebox_files_ref
  FROM challenges
  WHERE lab_id = $labIdEsc AND is_active = 1
  ORDER BY order_index ASC, challenge_id ASC
  LIMIT 1
");

if ($isLab18) {
    if (!$chRes || $chRes->num_rows === 0) {
        $ch = [
            'challenge_id' => 0,
            'title' => 'SECURE_ADMIN_PANEL_ROUTE',
            'whitebox_files_ref' => hackme_whitebox_lab18_meta_json(),
        ];
    } else {
        $ch = $chRes->fetch_assoc();
    }
    $rawRef = trim((string) ($ch['whitebox_files_ref'] ?? ''));
    if ($rawRef === '') {
        $rawRef = hackme_whitebox_lab18_meta_json();
    }
} elseif ($isLab19) {
    if (!$chRes || $chRes->num_rows === 0) {
        $ch = [
            'challenge_id' => 0,
            'title' => 'SECURE_PROFILE_USER_SCOPE',
            'whitebox_files_ref' => hackme_whitebox_lab19_meta_json(),
        ];
    } else {
        $ch = $chRes->fetch_assoc();
    }
    $rawRef = trim((string) ($ch['whitebox_files_ref'] ?? ''));
    if ($rawRef === '') {
        $rawRef = hackme_whitebox_lab19_meta_json();
    }
} elseif ($isSqlWb) {
    $ch = null;
    if ($chRes && $chRes->num_rows > 0) {
        $ch = $chRes->fetch_assoc();
    }
    $rawRef = '';
    if ($prodState['scoring_allowed'] && $ch !== null) {
        $rawRef = trim((string) ($ch['whitebox_files_ref'] ?? ''));
    } elseif ($ch !== null) {
        $rawRef = trim((string) ($ch['whitebox_files_ref'] ?? ''));
    }
    if ($rawRef === '' || !$prodState['scoring_allowed']) {
        if ($prodState['lab_in_db'] && $prodState['challenge_row'] && !$prodState['whitebox_ref_valid']) {
            error_log('[HackMe WARNING] whitebox lab_id=' . $labIdEsc . ' has challenge but invalid/empty whitebox_files_ref; using built-in meta for UI only.');
        }
        if ($rawRef === '') {
            $rawRef = $isLab12 ? hackme_whitebox_lab12_meta_json() : hackme_whitebox_lab1_meta_json();
        }
    }
} else {
    if (!$chRes || $chRes->num_rows === 0) {
        $ch = [
            'challenge_id' => 0,
            'title' => $labIdEsc === 21 ? 'SAFE_DOM_RENDER' : 'SAFE_REFLECTED_RENDER',
            'whitebox_files_ref' => hackme_whitebox_xss_meta_json_for_lab($labIdEsc),
        ];
    } else {
        $ch = $chRes->fetch_assoc();
    }
    $rawRef = trim((string) ($ch['whitebox_files_ref'] ?? ''));
    if ($rawRef === '') {
        $rawRef = hackme_whitebox_xss_meta_json_for_lab($labIdEsc);
    }
}

if ($rawRef === '') {
    echo json_encode(['success' => false, 'message' => 'This lab is not configured for white-box mode']);
    exit;
}

$meta = json_decode($rawRef, true);
if ((!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) && $isSqlWb) {
    if ($prodState['lab_in_db'] && trim($rawRef) !== '') {
        error_log('[HackMe WARNING] whitebox lab_id=' . $labIdEsc . ' invalid whitebox_files_ref JSON; using built-in meta for UI.');
    }
    $meta = hackme_whitebox_lab1_meta();
}
if ((!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) && $isLab18) {
    $meta = hackme_whitebox_lab18_meta();
}
if ((!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) && $isLab19) {
    $meta = hackme_whitebox_lab19_meta();
}
if ((!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) && $isXssWb) {
    $meta = hackme_whitebox_xss_meta_for_lab($labIdEsc);
}

if (!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid whitebox_files_ref JSON']);
    exit;
}

if ($ch === null) {
    $ch = [
        'challenge_id' => 0,
        'title' => 'SECURE_LOGIN_ENDPOINT',
        'whitebox_files_ref' => $rawRef,
    ];
}

$labRoot = null;
foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
    if ((int) ($cfg['lab_id'] ?? 0) !== $labIdEsc) {
        continue;
    }
    $folder = trim((string) ($cfg['folder'] ?? ''));
    $basePath = defined('LABS_BASE_PATH') ? rtrim(LABS_BASE_PATH, '\\/') : '';
    if ($basePath === '' || $folder === '') {
        break;
    }
    $joined = $basePath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $folder);
    $labRoot = realpath($joined) ?: null;
    break;
}

if ($labRoot === null || !is_dir($labRoot)) {
    if (!$isSqlWb && !$isAccessWb && !$isXssWb) {
        echo json_encode([
            'success' => false,
            'message' => 'Lab sources path is not available on the server. Set LABS_BASE_PATH in server/utils/labs_config.php to your Training Labs root.',
        ]);
        exit;
    }
}

$filesOut = [];
foreach ($meta['files'] as $f) {
    if (!is_array($f)) {
        continue;
    }
    $rel = trim((string) ($f['relative_path'] ?? $f['path'] ?? ''));
    $rel = str_replace(['\\', "\0"], ['/', ''], $rel);
    if ($rel === '' || strpos($rel, '..') !== false) {
        continue;
    }
    $useStub = false;
    $content = '';
    if (($isSqlWb || $isAccessWb || $isXssWb) && ($labRoot === null || !is_dir($labRoot))) {
        $useStub = true;
    } else {
        $abs = realpath($labRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
        if ($abs === false || !hackme_path_is_under_lab_root($abs, $labRoot)) {
            if ($isSqlWb || $isAccessWb || $isXssWb) {
                $useStub = true;
            } else {
                continue;
            }
        } elseif (!is_file($abs) || !is_readable($abs)) {
            if ($isSqlWb || $isAccessWb || $isXssWb) {
                $useStub = true;
            } else {
                continue;
            }
        } else {
            $content = (string) file_get_contents($abs);
        }
    }
    if ($useStub) {
        if ($isLab18) {
            $content = hackme_whitebox_lab18_stub_for_relative_path($rel);
        } elseif ($isLab19) {
            $content = hackme_whitebox_lab19_stub_for_relative_path($rel);
        } elseif ($isXssWb) {
            $content = hackme_whitebox_xss_stub_source($labIdEsc);
        } else {
            $content = hackme_whitebox_lab1_stub_login_source();
        }
    }
    if ($content === '') {
        continue;
    }
    if (strlen($content) > 512000) {
        $content = substr($content, 0, 512000) . "\n/* … truncated for IDE … */\n";
    }
    $filesOut[] = [
        'id' => (string) ($f['id'] ?? basename($rel)),
        'display_name' => (string) ($f['display_name'] ?? basename($rel)),
        'relative_path' => $rel,
        'vulnerable_line' => isset($f['vulnerable_line']) ? (int) $f['vulnerable_line'] : null,
        'content' => $content,
    ];
}

if ($filesOut === []) {
    echo json_encode(['success' => false, 'message' => 'No readable source files matched the lab configuration']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => [
        'lab' => [
            'lab_id' => (int) ($labRow['lab_id'] ?? 0),
            'title' => (string) ($labRow['title'] ?? ''),
            'description' => (string) ($labRow['description'] ?? ''),
            'labtype_id' => (int) ($labRow['labtype_id'] ?? 0),
        ],
        'challenge' => [
            'challenge_id' => (int) ($ch['challenge_id'] ?? 0),
            'title' => (string) ($ch['title'] ?? ''),
        ],
        'verify_profile' => (string) ($meta['verify_profile'] ?? ''),
        'verification_help' => $isLab18
            ? 'Inspect the bundle (multiple files). Remove assigning $_SESSION[\'role\'] from $_GET / $_REQUEST / $_POST, add a server-side 403 gate before ADMIN_PANEL output, and keep valid PHP (php -l).'
            : ($isLab19
                ? 'Inspect public/user_profile.php with the rest of the bundle. Stop trusting user_id from the URL for horizontal access: bind the lookup to $_SESSION[\'user_id\'], return 403 on mismatch, keep PROFILE_SECRET_* markers, php -l.'
                : ($isXssWb
                    ? 'Submit a secure patch for the highlighted sink. Reflected lab expects escaped output; DOM lab expects safe text sink (no innerHTML). Testing runs inside a sandboxed iframe.'
                    : 'Submissions are checked in an isolated temp file: PHP syntax (php -l) plus static rules ensuring SQL is parameterized (no username/password concatenated into query strings). If LABS_BASE_PATH is unset or wrong, an embedded api/login.php sample is used so the lab still loads.')),
        'sandbox_profile' => $labIdEsc === 21 ? 'dom_xss' : ($labIdEsc === 20 ? 'reflected_xss' : ''),
        'files' => $filesOut,
        'lab_unregistered' => $labUnregistered,
        'setup_incomplete' => $setupIncomplete,
        'scoring_allowed' => $prodState['scoring_allowed'],
    ],
]);
