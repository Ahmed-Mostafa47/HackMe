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
  // White Box Labs
  {
    lab_id: 1,
    title: "SQL_INJECTION_SOURCE_ANALYSIS",
    description:
      "Analyze vulnerable PHP source code to identify and exploit SQL injection points with full code access",
    labtype_id: 1,
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
  },
  {
    lab_id: 2,
    title: "BUFFER_OVERFLOW_CODE_REVIEW",
    description:
      "Review C source code to identify buffer overflow vulnerabilities and develop exploits",
    labtype_id: 1,
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
