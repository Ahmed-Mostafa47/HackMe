<?php
/**
 * Labs configuration - paths and registry for Training Labs integration.
 * LABS_BASE_PATH: Root folder containing all Training Labs (e.g. D:\Graduation_project\Training Labs).
 * If this path is wrong or missing SQL/, white-box lab 1 still loads using an embedded api/login.php sample.
 */
define('LABS_BASE_PATH', 'E:\\Level 4\\Semester1\\graduation\\Labs');

/** White-box SQL source lab (separate from black-box SQL lab_id = 1). */
define('HACKME_WHITEBOX_SQL_LAB_ID', 11);

$GLOBALS['LABS_REGISTRY'] = [
    [
        'lab_id' => 1,
        'folder' => 'SQL',
        'port' => 4000,
        'points' => 100,
    ],
    [
        'lab_id' => 11,
        'folder' => 'SQL',
        'port' => 4000,
        'points' => 100,
        // Display-only: white-box SQL shares the same UI card content as black-box SQL (lab 1).
        'whitebox_of_lab_id' => 1,
    ],
    [
        'lab_id' => 12,
        'folder' => 'SQL',
        'port' => 4000,
        'points' => 150,
        // Display-only: this white-box card mirrors the academy SQL lab (lab 10).
        'whitebox_of_lab_id' => 10,
    ],
    [
        'lab_id' => 5,
        'folder' => 'XSS/reflected-xss-lab',
        'port' => 4001,
        'points' => 100,
    ],
    [
        'lab_id' => 7,
        'folder' => 'XSS/dom-xss-select-lab',
        'port' => 4002,
        'points' => 100,
    ],
    [
        'lab_id' => 8,
        'folder' => 'BA',
        'port' => 4003,
        'points' => 100,
        'compose_file' => 'docker-compose.access-control.yml',
    ],
    [
        'lab_id' => 10,
        'folder' => 'SQL',
        'port' => 4000,
        'points' => 150,
    ],
    [
        'lab_id' => 40,
        'folder' => 'Games/hack-the-sudoku',
        'port' => 4011,
        'points' => 150,
    ],
    [
        'lab_id' => 41,
        'folder' => 'BLACK_BOX/game',
        'port' => 4010,
        'points' => 200,
    ],
    [
        'lab_id' => 42,
        'folder' => 'Games/javascript-videogame-the-maze-master',
        'port' => 4012,
        'points' => 180,
    ],
    [
        'lab_id' => 18,
        'folder' => 'BA',
        'port' => 4003,
        'points' => 100,
        'compose_file' => 'docker-compose.access-control.yml',
    ],
    [
        'lab_id' => 19,
        'folder' => 'BA',
        'port' => 4003,
        'points' => 100,
        'compose_file' => 'docker-compose.access-control.yml',
    ],
    [
        'lab_id' => 20,
        'folder' => 'XSS/reflected-xss-lab',
        'port' => 4001,
        'points' => 100,
    ],
    [
        'lab_id' => 21,
        'folder' => 'XSS/dom-xss-select-lab',
        'port' => 4002,
        'points' => 100,
    ],
    [
        'lab_id' => 30,
        'folder' => 'GameLabs/war-game',
        'port' => 4005,
        'points' => 100,
    ],
];

/**
 * Display-only: map white-box lab_id -> black-box lab_id for unified UI text.
 */
function hackme_whitebox_of_lab_id(int $whiteboxLabId): ?int
{
    $wid = (int) $whiteboxLabId;
    foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
        if (!is_array($cfg)) {
            continue;
        }
        if ((int) ($cfg['lab_id'] ?? 0) !== $wid) {
            continue;
        }
        $of = (int) ($cfg['whitebox_of_lab_id'] ?? 0);
        return $of > 0 ? $of : null;
    }
    return null;
}
