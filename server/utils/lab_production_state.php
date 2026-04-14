<?php
declare(strict_types=1);

/**
 * Production consistency: DB is the source of truth for scoring.
 * Use these flags for UI fallbacks vs graded submissions.
 */

/**
 * @return array{
 *   lab_in_db: bool,
 *   lab_public: bool,
 *   challenge_row: bool,
 *   whitebox_ref_valid: bool,
 *   scoring_allowed: bool,
 *   setup_incomplete: bool
 * }
 */
function hackme_whitebox_production_state(mysqli $conn, int $labId): array
{
    $id = (int) $labId;
    $labInDb = false;
    $labPublic = false;

    $labRes = $conn->query("
        SELECT lab_id, is_published, visibility
        FROM labs
        WHERE lab_id = {$id}
        LIMIT 1
    ");
    if ($labRes && $labRes->num_rows > 0) {
        $labInDb = true;
        $row = $labRes->fetch_assoc();
        $labPublic = ((int) ($row['is_published'] ?? 0) === 1)
            && ((string) ($row['visibility'] ?? '') === 'public');
    }

    $challengeRow = false;
    $whiteboxRefValid = false;
    $chRes = $conn->query("
        SELECT challenge_id, whitebox_files_ref
        FROM challenges
        WHERE lab_id = {$id} AND is_active = 1
        ORDER BY order_index ASC, challenge_id ASC
        LIMIT 1
    ");
    if ($chRes && $chRes->num_rows > 0) {
        $challengeRow = true;
        $crow = $chRes->fetch_assoc();
        $ref = trim((string) ($crow['whitebox_files_ref'] ?? ''));
        if ($ref !== '') {
            $decoded = json_decode($ref, true);
            if (is_array($decoded) && !empty($decoded['files']) && is_array($decoded['files'])) {
                $whiteboxRefValid = true;
            }
        }
    }

    // Submissions always record graded completion after verify (submit no longer uses demo-only path).
    // setup_incomplete / lab_in_db still drive UI warnings and migrations.
    $scoringAllowed = true;
    $setupIncomplete = !$labInDb || !$whiteboxRefValid;

    return [
        'lab_in_db' => $labInDb,
        'lab_public' => $labPublic,
        'challenge_row' => $challengeRow,
        'whitebox_ref_valid' => $whiteboxRefValid,
        'scoring_allowed' => $scoringAllowed,
        'setup_incomplete' => $setupIncomplete,
    ];
}
