<?php
/**
 * HackMe Lab Solved - Report completion to HackMe when lab is solved (no flag).
 * COPY THIS FILE to your Training Lab root (e.g. D:\Graduation_project\Training Labs\XSS\reflected-xss-lab\solved.php)
 *
 * Expects labId and token in GET (from the lab URL when opened from HackMe: ?labId=5&token=xxx)
 */
$labId = (int)($_GET['labId'] ?? $_GET['lab_id'] ?? 0);
$token = trim((string)($_GET['token'] ?? ''));

// HackMe API - adjust if your HackMe URL is different
$hackMeApi = 'http://localhost/HackMe/server/api/labs/lab_solved.php';

?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lab Solved</title>
</head>
<body>
  <div id="result">Reporting to HackMe...</div>
  <script>
    (function() {
      var labId = <?= (int)$labId ?>;
      var token = <?= json_encode($token) ?>;
      var api = <?= json_encode($hackMeApi) ?>;

      if (!labId || !token) {
        document.getElementById('result').textContent = 'Missing labId or token. (Open lab from HackMe "Start Lab" to get points)';
        return;
      }

      fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_id: labId, token: token })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var el = document.getElementById('result');
        if (data.success) {
          var pts = (data.data && data.data.points_earned) ? data.data.points_earned : 100;
          el.innerHTML = 'Lab solved! +' + pts + ' points awarded. Return to HackMe to see your progress.';
          if (window.opener) {
            window.opener.postMessage({
              type: 'HACKME_LAB_SOLVED',
              labId: labId,
              points: pts
            }, '*');
          }
        } else {
          el.textContent = 'Error: ' + (data.message || 'Unknown');
        }
      })
      .catch(function(err) {
        document.getElementById('result').textContent = 'Failed: ' + err.message + ' (Is HackMe/Apache running?)';
      });
    })();
  </script>
</body>
</html>
