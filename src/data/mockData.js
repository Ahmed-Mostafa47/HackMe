import { LAB_TYPES } from "./labTypes";

// Mock data matching your database schema
export const mockUsers = [
  {
    user_id: 1,
    username: "operative_01",
    email: "user@cyberops.com",
    full_name: "Security Operative",
    total_points: 450,
    profile_meta: {
      avatar: "💀",
      rank: "OPERATIVE",
      specialization: "PENETRATION_TESTING",
      join_date: "2024-01-01T00:00:00Z",
    },
  },
];

export const mockLabTypes = [
  {
    labtype_id: 1,
    name: LAB_TYPES.WHITE_BOX,
    description: "White Box Testing Labs",
  },
  {
    labtype_id: 2,
    name: LAB_TYPES.BLACK_BOX,
    description: "Black Box Testing Labs",
  },
  {
    labtype_id: 3,
    name: LAB_TYPES.ACCESS_CONTROL,
    description: "Access Control & Privilege Escalation",
  },
];

export const mockLabs = [
  // Black Box Labs (formerly White Box)
  {
    lab_id: 1,
    port: 4000,
    title: "SQL_INJECTION_SOURCE_ANALYSIS",
    description:
      "Analyze vulnerable PHP source code to identify and exploit SQL injection points with full code access",
    labtype_id: 2,
    difficulty: "medium",
    points_total: 150,
    is_published: true,
    visibility: "public",
    docker_image: "cyberops/sql-injection-whitebox",
    created_by: 1,
    whitebox_files: ["login.php", "database_config.php", "user_management.php"],
    progress: 80,
    status: "IN_PROGRESS",
    icon: "💉",
    hints: [
      "Inspect authentication inputs for injectable query fragments.",
      "Try bypass payloads using boolean conditions to force login success.",
    ],
    solution:
      "The vulnerable login query is injectable through user-controlled input. Use a boolean-based SQL injection payload in the username field to bypass authentication, then enumerate database records with a UNION-based payload to complete the challenge path.",
  },
  {
    lab_id: 2,
    title: "BUFFER_OVERFLOW_CODE_REVIEW",
    description:
      "Review C source code to identify buffer overflow vulnerabilities and develop exploits",
    labtype_id: 2,
    difficulty: "hard",
    points_total: 250,
    is_published: true,
    visibility: "public",
    docker_image: "cyberops/buffer-overflow-whitebox",
    created_by: 1,
    whitebox_files: [
      "vulnerable_server.c",
      "exploit_dev.c",
      "memory_analysis.txt",
    ],
    progress: 20,
    status: "STARTED",
    icon: "💥",
    hints: [
      "Trace where fixed-size buffers copy untrusted user data.",
      "Verify bounds checks and identify unsafe string functions.",
    ],
    solution:
      "Identify the unsafe copy operation and calculate the exact overwrite offset. Craft input that controls execution flow without crashing the process, then deliver the exploit payload to trigger the intended behavior.",
  },

  // Black Box Labs
  {
    lab_id: 3,
    title: "BLIND_SQL_INJECTION",
    description:
      "Exploit SQL injection vulnerabilities without source code access using blind techniques",
    labtype_id: 2,
    difficulty: "medium",
    points_total: 200,
    is_published: true,
    visibility: "public",
    docker_image: "cyberops/blind-sql-blackbox",
    created_by: 1,
    blackbox_endpoints: ["/login", "/search", "/user/profile"],
    progress: 0,
    status: "LOCKED",
    icon: "🎯",
    hints: [
      "Use response timing differences to infer true/false SQL conditions.",
      "Extract information incrementally with character-by-character predicates.",
    ],
    solution:
      "Exploit the blind injection point using time-based payloads such as conditional sleep expressions. Build automated requests to recover schema and target values by observing delayed responses.",
  },
  {
    lab_id: 4,
    title: "XSS_BLACK_BOX_DETECTION",
    description:
      "Discover and exploit Cross-Site Scripting vulnerabilities through external testing",
    labtype_id: 2,
    difficulty: "easy",
    points_total: 100,
    is_published: true,
    visibility: "public",
    docker_image: "cyberops/xss-blackbox",
    created_by: 1,
    blackbox_endpoints: ["/contact", "/comment", "/search"],
    progress: 0,
    status: "NOT_STARTED",
    icon: "⚡",
    hints: [
      "Probe reflected parameters first, then test script-context breakouts.",
      "Use payloads that remain valid within HTML attributes and text contexts.",
    ],
    solution:
      "Locate the reflected input sink and confirm unsanitized output. Craft an XSS payload matched to the rendering context so JavaScript executes in the victim browser, then demonstrate impact with a controlled action.",
  },
  {
    lab_id: 5,
    port: 4001,
    title: "REFLECTED_XSS_BLOG_LAB",
    display_name: "Reflected XSS Blog Lab",
    description:
      "Exploit a Reflected XSS vulnerability in a blog search feature. Execute a script payload to trigger alert().",
    labtype_id: 2,
    difficulty: "medium",
    points_total: 100,
    is_published: true,
    visibility: "public",
    progress: 0,
    status: "NOT_STARTED",
    icon: "⚡",
    hints: [
      "The vulnerable point is the search endpoint in the blog page.",
      "Try payloads that immediately call alert in reflected output.",
    ],
    solution:
      "Inject a reflected payload through the search parameter so it is rendered unsafely by the blog UI. A working JavaScript payload should execute and trigger alert, which marks the lab as solved.",
  },
  {
    lab_id: 7,
    port: 4002,
    title: "DOM_XSS_DOCUMENT_WRITE_LAB",
    display_name: "DOM XSS in innerHTML sink using source location.search",
    description:
      "This lab contains a DOM-based XSS vulnerability in the watch store search bar. The search value from the URL is written into the page via innerHTML (not echoed by the server). Hint: innerHTML does not execute script tags—use an event handler payload. To solve this lab, perform a cross-site scripting attack that calls the alert function.",
    labtype_id: 2,
    difficulty: "easy",
    points_total: 100,
    is_published: true,
    visibility: "public",
    progress: 0,
    status: "NOT_STARTED",
    icon: "⚡",
    hints: [
      "This is DOM XSS, so inspect client-side JavaScript sinks.",
      "Use an event-handler payload because script tags may not execute in innerHTML.",
    ],
    solution:
      "The page reads attacker-controlled data from the URL and writes it into an innerHTML sink. Inject a payload with an executable event handler (for example, image error handler) to execute alert and complete the lab.",
  },
  {
    lab_id: 8,
    title: "ACCESS_CONTROL_BYPASS",
    description:
      "Test role-based access control: bypass restrictions and escalate privileges",
    labtype_id: 3,
    difficulty: "medium",
    points_total: 100,
    is_published: true,
    visibility: "public",
    docker_image: "cyberops/access-control-lab",
    created_by: 1,
    progress: 0,
    status: "NOT_STARTED",
    icon: "🔐",
    hints: [
      "Enumerate restricted endpoints and compare user/admin behavior.",
      "Test whether role checks are enforced on the server, not only in the UI.",
    ],
    solution:
      "Identify a privileged feature exposed without robust server-side authorization. Access the protected route directly or manipulate request context to bypass role checks and retrieve the access-control flag.",
  },
  {
    lab_id: 9,
    title: "IDOR_AND_HORIZONTAL_ACCESS",
    description:
      "Find and exploit Insecure Direct Object Reference and horizontal access control flaws",
    labtype_id: 3,
    difficulty: "medium",
    points_total: 120,
    is_published: true,
    visibility: "public",
    docker_image: "cyberops/idor-lab",
    created_by: 1,
    progress: 0,
    status: "NOT_STARTED",
    icon: "🔐",
    hints: [
      "Look for numeric IDs in URLs or API requests.",
      "Change object identifiers to another user and verify unauthorized access.",
    ],
    solution:
      "Exploit insecure direct object reference by modifying a resource identifier tied to another account. Because ownership validation is missing, the application returns unauthorized data and confirms the access-control bypass.",
  },
  {
    lab_id: 10,
    port: 4000,
    title: "SQL_INJECTION_ACADEMY",
    description:
      "Exploit SQL injection on a programming academy site. Use sqlmap to discover tables and users, get the admin email, log in as admin, and delete a user to capture the flag.",
    labtype_id: 2,
    difficulty: "medium",
    points_total: 150,
    is_published: true,
    visibility: "public",
    created_by: 1,
    progress: 0,
    status: "NOT_STARTED",
    icon: "💉",
  },
];

export const mockChallenges = [
  {
    challenge_id: 1,
    lab_id: 1,
    title: "AUTHENTICATION_BYPASS",
    statement:
      "Bypass the login authentication using SQL injection in the username field",
    order_index: 1,
    max_score: 50,
    difficulty: "medium",
    whitebox_files_ref: ["login.php"],
    testcases: [
      {
        testcase_id: 1,
        type: "flag_match",
        secret_flag_plain: "FLAG{AUTH_BYPASS_123}",
        points: 50,
      },
    ],
    hints: [
      {
        hint_id: 1,
        text: "Try using single quote to break the SQL query",
        penalty_points: 10,
      },
    ],
  },
  {
    challenge_id: 2,
    lab_id: 1,
    title: "DATA_EXFILTRATION",
    statement:
      "Extract all user data from the database using UNION-based injection",
    order_index: 2,
    max_score: 100,
    difficulty: "hard",
    whitebox_files_ref: ["user_management.php"],
    testcases: [
      {
        testcase_id: 2,
        type: "flag_match",
        secret_flag_plain: "FLAG{DATA_EXFIL_456}",
        points: 100,
      },
    ],
  },
  {
    challenge_id: 3,
    lab_id: 3,
    title: "BLIND_TIME_BASED_SQLI",
    statement:
      "Exploit time-based blind SQL injection to extract database information",
    order_index: 1,
    max_score: 150,
    difficulty: "hard",
    testcases: [
      {
        testcase_id: 3,
        type: "flag_match",
        secret_flag_plain: "FLAG{BLIND_SQLI_789}",
        points: 150,
      },
    ],
  },
];

export const mockSubmissions = [
  {
    submission_id: 1,
    user_id: 1,
    challenge_id: 1,
    type: "flag",
    payload_text: "FLAG{AUTH_BYPASS_123}",
    status: "graded",
    final_score: 50,
    submitted_at: "2024-01-15T10:30:00Z",
  },
];
