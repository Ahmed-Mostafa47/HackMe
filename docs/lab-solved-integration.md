# Training Lab → HackMe Solved Integration

For labs without flags (e.g. Reflected XSS), the Training Lab must report completion to HackMe so points are awarded and the lab shows as solved.

## Required: Add `solved.php` to Your Training Lab

Place `solved.php` in the root of your Training Lab folder (e.g. `D:\Graduation_project\Training Labs\XSS\reflected-xss-lab\solved.php`).

### solved.php template

```php
<?php
/**
 * HackMe Lab Solved - Report completion to HackMe when lab is solved (no flag).
 * Expects labId and token in GET (from opener URL when lab was opened).
 */
$labId = (int)($_GET['labId'] ?? $_GET['lab_id'] ?? 0);
$token = trim((string)($_GET['token'] ?? ''));

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
        document.getElementById('result').textContent = 'Missing labId or token.';
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
          el.innerHTML = 'Lab solved! +' + pts + ' points awarded.';
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
        document.getElementById('result').textContent = 'Failed: ' + err.message;
      });
    })();
  </script>
</body>
</html>
```

## How to trigger solved.php from your lab

When the user solves the lab (e.g. triggers XSS), redirect to solved.php with `labId` and `token` from the current URL:

```javascript
// Get params from current page URL (you opened with ?labId=5&token=xxx)
var params = new URLSearchParams(window.location.search);
var labId = params.get('labId') || params.get('lab_id');
var token = params.get('token');
if (labId && token) {
  window.location.href = 'solved.php?labId=' + labId + '&token=' + encodeURIComponent(token);
} else {
  alert('Lab solved! (Not launched from HackMe - no points)');
}
```

For XSS labs that use `alert()` as the solve condition, override alert to redirect:

```javascript
var _alert = window.alert;
window.alert = function(msg) {
  var params = new URLSearchParams(window.location.search);
  var labId = params.get('labId') || params.get('lab_id');
  var token = params.get('token');
  if (labId && token) {
    window.location.href = 'solved.php?labId=' + labId + '&token=' + encodeURIComponent(token);
  } else {
    _alert.call(window, msg);
  }
};
```

## Flow summary

1. User clicks "Start Lab" in HackMe → opens `http://localhost:4001/?labId=5&token=xxx`
2. User solves the lab (e.g. triggers XSS alert)
3. Lab redirects to `solved.php?labId=5&token=xxx`
4. solved.php calls HackMe's `lab_solved.php` API
5. HackMe credits points and updates leaderboard
6. solved.php sends `postMessage` to `window.opener` (HackMe)
7. HackMe shows "Lab solved" toast and updates UI
