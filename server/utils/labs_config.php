<?php
/**
 * Labs configuration - paths and registry for Training Labs integration.
 * LABS_BASE_PATH: Root folder containing all Training Labs (e.g. D:\Graduation_project\Training Labs).
 * If this path is wrong or missing SQL/, white-box lab 1 still loads using an embedded api/login.php sample.
 */
define('LABS_BASE_PATH', 'C:\Users\ahmed\Desktop\4th cs\Labs');

$GLOBALS['LABS_REGISTRY'] = [
    [
        'lab_id' => 1,
        'folder' => 'SQL',
        'port' => 4000,
        'points' => 100,
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
];
