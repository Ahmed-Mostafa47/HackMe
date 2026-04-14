<?php
/**
 * Labs configuration - paths and registry for Training Labs integration.
 * LABS_BASE_PATH: Root folder containing all Training Labs (e.g. D:\Graduation_project\Training Labs)
 */
define('LABS_BASE_PATH', 'E:\\Level 4\\Semester1\\graduation\\Labs');

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
];
