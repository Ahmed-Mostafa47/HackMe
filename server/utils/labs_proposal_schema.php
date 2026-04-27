<?php
declare(strict_types=1);

/**
 * Ensures optional columns exist on `labs` for approved proposal cards.
 * Returns true only if both columns exist (ALTER may be denied on some hosts).
 *
 * @param PdoMysqliShim $conn
 */
function hackme_ensure_labs_proposal_columns($conn): bool
{
    $check = $conn->query("SHOW COLUMNS FROM labs LIKE 'owasp_category_key'");
    if ($check && $check->num_rows === 0) {
        $conn->query(
            'ALTER TABLE labs ADD COLUMN owasp_category_key VARCHAR(128) NULL DEFAULT NULL AFTER launch_path'
        );
    }
    $check2 = $conn->query("SHOW COLUMNS FROM labs LIKE 'coming_soon'");
    if ($check2 && $check2->num_rows === 0) {
        $conn->query(
            'ALTER TABLE labs ADD COLUMN coming_soon TINYINT(1) NOT NULL DEFAULT 0 AFTER owasp_category_key'
        );
    }

    $c1 = $conn->query("SHOW COLUMNS FROM labs LIKE 'owasp_category_key'");
    $c2 = $conn->query("SHOW COLUMNS FROM labs LIKE 'coming_soon'");

    return ($c1 && $c1->num_rows > 0 && $c2 && $c2->num_rows > 0);
}
