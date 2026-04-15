<?php
declare(strict_types=1);

function hackme_whitebox_xss_lab_ids(): array
{
    return [20, 21];
}

function hackme_whitebox_xss_is_supported(int $labId): bool
{
    return in_array($labId, hackme_whitebox_xss_lab_ids(), true);
}

function hackme_whitebox_xss_fallback_lab_row(int $labId): array
{
    if ($labId === 21) {
        return [
            'lab_id' => 21,
            'title' => 'DOM XSS - Whitebox',
            'labtype_id' => 1,
            'description' => 'White-box DOM XSS lab: inspect source and fix unsafe sink.',
        ];
    }
    return [
        'lab_id' => 20,
        'title' => 'Reflected XSS - Whitebox',
        'labtype_id' => 1,
        'description' => 'White-box reflected XSS lab: inspect source and fix reflected output.',
    ];
}

function hackme_whitebox_xss_lab20_meta(): array
{
    return [
        'version' => 1,
        'verify_profile' => 'lab20_reflected_xss',
        'files' => [
            [
                'id' => 'search',
                'display_name' => 'search.php',
                'relative_path' => 'search.php',
                'vulnerable_line' => 6,
            ],
        ],
    ];
}

function hackme_whitebox_xss_lab21_meta(): array
{
    return [
        'version' => 1,
        'verify_profile' => 'lab21_dom_xss',
        'files' => [
            [
                'id' => 'appjs',
                'display_name' => 'app.js',
                'relative_path' => 'app.js',
                'vulnerable_line' => 4,
            ],
        ],
    ];
}

function hackme_whitebox_xss_meta_for_lab(int $labId): array
{
    if ($labId === 21) {
        return hackme_whitebox_xss_lab21_meta();
    }
    return hackme_whitebox_xss_lab20_meta();
}

function hackme_whitebox_xss_meta_json_for_lab(int $labId): string
{
    return json_encode(hackme_whitebox_xss_meta_for_lab($labId), JSON_UNESCAPED_SLASHES);
}

function hackme_whitebox_xss_stub_source(int $labId): string
{
    if ($labId === 21) {
        return <<<'JS'
const params = new URLSearchParams(window.location.search);
const term = params.get("q") || "";
const target = document.getElementById("result");
target.innerHTML = "<p>Results for: " + term + "</p>";
JS;
    }
    return <<<'PHP'
<?php
$query = $_GET['q'] ?? '';
?>
<h1>Search</h1>
<div id="results">
<?php echo "<p>Results for: " . $query . "</p>"; ?>
</div>
PHP;
}
