<?php
// ---------------------------------------------------------------------------
// Technician application relay → SendGrid email (cPanel / PHP edition).
// CHANGELOG #081.
//
// WHY THIS EXISTS
//   The marketing site is a Next.js STATIC export served from cPanel — static
//   files can't send email, and the SendGrid secret key must never live in the
//   browser bundle. Previously that "one bit of server code" ran on a separate
//   Vercel deployment (src/app/api/technician/route.server.ts), which the
//   static site had to call CROSS-ORIGIN — the source of the CORS failures and,
//   ultimately, a Vercel plan-upgrade wall. This PHP file replaces that: it
//   ships INSIDE the static build (public/api/ → out/api/ → cPanel /api/) and
//   runs on the SAME host + origin as the site, so there is no cross-origin
//   request and no CORS to get wrong. Vercel is no longer in the path.
//
// HOW THE FORM REACHES IT
//   src/components/expert/TechnicianForm.tsx POSTs JSON to
//   NEXT_PUBLIC_TECHNICIAN_ENDPOINT, set to "/api/technician.php" for the
//   static cPanel build (see .github/workflows/deploy-cpanel.yml). Same origin.
//
// THE SECRET (SendGrid API key) — NEVER in the repo or the web root
//   This file is public (it's served by Apache), so the key does NOT live here.
//   It lives in a small PHP config file placed ONCE, by hand, ABOVE the web
//   root (outside public_html), where Apache will never serve it and the FTP
//   deploy — which only syncs the site folder — will never touch or delete it.
//   See the deployment note at the bottom of this file for the exact steps.
//
//   The config file returns an array:
//     <?php return [
//         'SENDGRID_API_KEY' => 'SG.xxxxxxxx',            // required
//         'FROM_EMAIL'       => 'noreply@pockitengineers.com', // verified sender
//         'TO_EMAIL'         => 'itsupport@pockitengineers.com',
//     ];
//
//   Resolution order:
//     1. $_SERVER / getenv('SENDGRID_API_KEY' etc.)  — if you SetEnv in cPanel.
//     2. A file named  pockit-secrets/technician.php  found by walking UP from
//        this file's directory (handles unknown home-dir depth).
//     3. An explicit path in the TECHNICIAN_CONFIG env var.
// ---------------------------------------------------------------------------

declare(strict_types=1);

// --- CORS ------------------------------------------------------------------
// Same-origin in production, so CORS is belt-and-braces (covers www vs apex,
// and http→https edge cases). Echo the request origin only when allow-listed.
$ALLOWED_ORIGINS = [
    'https://www.pockitengineers.com',
    'https://pockitengineers.com',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: content-type');
header('Access-Control-Max-Age: 86400');

// Preflight.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(405, ['ok' => false, 'reason' => 'method_not_allowed']);
}

// --- Load config (secret) --------------------------------------------------
function loadConfig(): array {
    $cfg = [
        'SENDGRID_API_KEY' => getenv('SENDGRID_API_KEY') ?: ($_SERVER['SENDGRID_API_KEY'] ?? ''),
        'FROM_EMAIL'       => getenv('TECHNICIAN_FROM_EMAIL') ?: 'noreply@pockitengineers.com',
        'TO_EMAIL'         => getenv('TECHNICIAN_TO_EMAIL') ?: 'itsupport@pockitengineers.com',
    ];

    // Explicit path override, else walk up looking for pockit-secrets/technician.php.
    $candidates = [];
    $override = getenv('TECHNICIAN_CONFIG');
    if ($override) {
        $candidates[] = $override;
    }
    $dir = __DIR__;
    for ($i = 0; $i < 8; $i++) {
        $candidates[] = $dir . '/pockit-secrets/technician.php';
        $parent = dirname($dir);
        if ($parent === $dir) {
            break; // reached filesystem root
        }
        $dir = $parent;
    }

    foreach ($candidates as $path) {
        if (is_string($path) && $path !== '' && is_file($path)) {
            $loaded = include $path;
            if (is_array($loaded)) {
                // File values win over env defaults only when non-empty.
                foreach (['SENDGRID_API_KEY', 'FROM_EMAIL', 'TO_EMAIL'] as $k) {
                    if (!empty($loaded[$k])) {
                        $cfg[$k] = $loaded[$k];
                    }
                }
            }
            break;
        }
    }

    return $cfg;
}

$config = loadConfig();

if (empty($config['SENDGRID_API_KEY'])) {
    error_log('[technician] SENDGRID_API_KEY not configured (no env var and no pockit-secrets/technician.php found)');
    respond(503, ['ok' => false, 'reason' => 'email_not_configured']);
}

// --- Parse + validate input ------------------------------------------------
$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) {
    respond(400, ['ok' => false, 'reason' => 'invalid_json']);
}

// Trim + clamp a free-text field so a hostile client can't stuff the email.
function clean($value, int $max = 120): string {
    return is_string($value) ? mb_substr(trim($value), 0, $max) : '';
}

$firstName     = clean($body['firstName'] ?? null);
$lastName      = clean($body['lastName'] ?? null);
$contactNumber = clean($body['contactNumber'] ?? null, 30);
$city          = clean($body['city'] ?? null);

// Skill id → label. MUST mirror EXPERT_FORM.skills in src/constants/copy.ts.
// (PHP can't import the TS constant; keep these two lists in sync by hand.)
$SKILL_LABELS = [
    'laptop_desktop' => 'Laptop/Desktop',
    'macbook'        => 'MacBook',
    'printer'        => 'Printer',
    'cctv'           => 'CCTV',
    'smart_tv'       => 'Smart TV',
    'smart_phone'    => 'Smart Phone',
];

$skillIds = [];
if (isset($body['skills']) && is_array($body['skills'])) {
    foreach ($body['skills'] as $s) {
        if (is_string($s) && isset($SKILL_LABELS[$s]) && !in_array($s, $skillIds, true)) {
            $skillIds[] = $s;
        }
    }
}
$skillLabels = array_map(fn($id) => $SKILL_LABELS[$id], $skillIds);

// Required-field validation (skills optional).
if ($firstName === '' || $lastName === '' || $contactNumber === '' || $city === '') {
    respond(400, ['ok' => false, 'reason' => 'missing_fields']);
}

$fullName   = "$firstName $lastName";
$skillsText = $skillLabels ? implode(', ', $skillLabels) : '—';

$textBody = implode("\n", [
    'New technician application from pockitengineers.com',
    '',
    "Name:     $fullName",
    "Contact:  $contactNumber",
    "City:     $city",
    "Skills:   $skillsText",
]);

$e = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
$htmlBody = '
    <h2 style="margin:0 0 12px;font-family:sans-serif">New technician application</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Name</td><td><strong>' . $e($fullName) . '</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Contact</td><td>' . $e($contactNumber) . '</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">City</td><td>' . $e($city) . '</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Skills</td><td>' . $e($skillsText) . '</td></tr>
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:16px">
        Sent from the Become a Technician form.
    </p>';

// --- Send via SendGrid v3 API ----------------------------------------------
$payload = [
    'personalizations' => [[
        'to'      => [['email' => $config['TO_EMAIL']]],
        'subject' => "New technician application — $fullName ($city)",
    ]],
    'from'     => ['email' => $config['FROM_EMAIL'], 'name' => 'Pockit Website'],
    'reply_to' => ['email' => $config['FROM_EMAIL'], 'name' => $fullName],
    'content'  => [
        ['type' => 'text/plain', 'value' => $textBody],
        ['type' => 'text/html',  'value' => $htmlBody],
    ],
];

$ch = curl_init('https://api.sendgrid.com/v3/mail/send');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $config['SENDGRID_API_KEY'],
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_TIMEOUT        => 15,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// SendGrid returns 202 Accepted on success.
if ($httpCode >= 200 && $httpCode < 300) {
    respond(200, ['ok' => true]);
}

error_log('[technician] SendGrid send failed: http=' . $httpCode . ' curl=' . $curlErr . ' body=' . $response);
respond(502, ['ok' => false, 'reason' => 'send_failed']);

// ---------------------------------------------------------------------------
// ONE-TIME cPanel DEPLOYMENT (do this once, by hand):
//
//   1. In cPanel → File Manager, go to your account HOME directory — the
//      level that CONTAINS public_html (NOT inside public_html).
//   2. Create a folder:  pockit-secrets
//   3. Inside it create a file:  technician.php  with:
//
//        <?php return [
//            'SENDGRID_API_KEY' => 'SG.your-real-key-here',
//            'FROM_EMAIL'       => 'noreply@pockitengineers.com', // verified sender
//            'TO_EMAIL'         => 'itsupport@pockitengineers.com',
//        ];
//
//   4. Save. That's it — this technician.php endpoint walks up the directory
//      tree, finds pockit-secrets/technician.php, and reads the key. Because
//      the folder is above public_html, Apache never serves it and the GitHub
//      FTP deploy (which only syncs the site folder) never overwrites it.
//
//   Verify sender first: SendGrid → Settings → Sender Authentication →
//   "noreply@pockitengineers.com" must show Verified, or SendGrid rejects the
//   send (this endpoint will return {"ok":false,"reason":"send_failed"}).
// ---------------------------------------------------------------------------
