/**
 * OWASP Top 10 (2021) — category keys for training labs (after White / Black selection).
 * Labs are grouped by inferred vulnerability from title / known lab_id pins.
 */

import { WHITEBOX_SQL_LAB_ID, WHITEBOX_XSS_LAB_IDS } from "../constants/labs";

/** Black-box game / logic labs — always A04 regardless of noisy DB owasp_category_key */
const PINNED_A04_GAME_LAB_IDS = new Set([40, 41]);

/** OWASP Top 10 (2021), fixed UI order */
export const OWASP_TOP_10 = [
  {
    key: "a01_broken_access_control",
    code: "A01",
    label: "Broken Access Control",
    icon: "🔓",
    keywords: [
      "broken",
      "access",
      "idor",
      "authorization",
      "privilege",
      "bypass",
      "access_control",
      "horizontal",
      "vertical",
      "csrf",
      "cross-site request",
    ],
  },
  {
    key: "a02_cryptographic_failures",
    code: "A02",
    label: "Cryptographic Failures",
    icon: "🔐",
    keywords: [
      "crypto",
      "cipher",
      "ssl",
      "tls",
      "encryption",
      "hash",
      "sensitive data",
      "weak password",
      "cleartext",
    ],
  },
  {
    key: "a03_injection",
    code: "A03",
    label: "Injection",
    icon: "💉",
    keywords: [
      "sql",
      "sqli",
      "injection",
      "xss",
      "cross-site scripting",
      "command injection",
      "ldap",
      "nosql",
      "buffer",
      "overflow",
      "inject",
    ],
  },
  {
    key: "a04_insecure_design",
    code: "A04",
    label: "Insecure Design",
    icon: "📐",
    keywords: [
      "insecure design",
      "design flaw",
      "business logic",
      "threat model",
      "game",
      "games",
      "frogger",
      "sudoku",
      "ctf",
      "arcade",
      "devtools",
      "override",
    ],
  },
  {
    key: "a05_security_misconfiguration",
    code: "A05",
    label: "Security Misconfiguration",
    icon: "⚙️",
    keywords: [
      "misconfig",
      "default account",
      "error handling",
      "stack trace",
      "directory listing",
      "unnecessary feature",
      "cloud storage",
      "exposed",
    ],
  },
  {
    key: "a06_vulnerable_outdated_components",
    code: "A06",
    label: "Vulnerable & Outdated Components",
    icon: "📦",
    keywords: [
      "outdated",
      "component",
      "dependency",
      "cve",
      "unpatched",
      "library version",
      "vulnerable package",
    ],
  },
  {
    key: "a07_identification_authentication_failures",
    code: "A07",
    label: "Identification & Authentication Failures",
    icon: "🔑",
    keywords: [
      "authentication",
      "session",
      "credential",
      "password reset",
      "jwt",
      "brute force",
      "mfa",
      "2fa",
      "weak login",
      "credential stuffing",
    ],
  },
  {
    key: "a08_software_data_integrity_failures",
    code: "A08",
    label: "Software & Data Integrity Failures",
    icon: "✍️",
    keywords: [
      "integrity",
      "deserialization",
      "unsigned",
      "update without",
      "ci/cd",
      "supply chain",
      "untrusted source",
    ],
  },
  {
    key: "a09_security_logging_monitoring_failures",
    code: "A09",
    label: "Security Logging & Monitoring Failures",
    icon: "📋",
    keywords: [
      "logging",
      "monitoring",
      "siem",
      "audit",
      "alert",
      "insufficient logging",
    ],
  },
  {
    key: "a10_ssrf",
    code: "A10",
    label: "Server-Side Request Forgery (SSRF)",
    icon: "🌐",
    keywords: ["ssrf", "server-side request", "internal url", "url fetch", "webhook abuse"],
  },
];

export const OWASP_CATEGORY_ORDER = OWASP_TOP_10.map((c) => c.key);

const OWASP_KEY_SET = new Set(OWASP_CATEGORY_ORDER);

/** Human-readable label for a custom (non–Top-10) category slug from proposals. */
export function formatDynamicCategoryLabel(key) {
  if (key == null || key === "") return "Other";
  return String(key)
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolve OWASP / proposal folder key: known game-lab ids → A04; else explicit DB key; else title + lab_id.
 * @param {object} lab
 */
export function getCategoryKeyForLab(lab) {
  if (!lab || typeof lab !== "object") {
    return "a01_broken_access_control";
  }
  const lid = Number(lab.lab_id);
  if (!Number.isNaN(lid) && PINNED_A04_GAME_LAB_IDS.has(lid)) {
    return "a04_insecure_design";
  }
  const raw = lab.owasp_category_key;
  if (raw != null && String(raw).trim() !== "") {
    return normalizeCategoryKey(String(raw).trim());
  }
  return getCategoryFromLabTitle(lab.title, lab.lab_id);
}

/** Map pre-OWASP category URL keys to OWASP keys (bookmarks / old links). */
export const LEGACY_CATEGORY_TO_OWASP = {
  game: "a04_insecure_design",
  sql_injection: "a03_injection",
  xss: "a03_injection",
  broken_access: "a01_broken_access_control",
  csrf: "a01_broken_access_control",
  buffer_overflow: "a03_injection",
};

export function normalizeCategoryKey(key) {
  if (key == null || key === "") return key;
  return LEGACY_CATEGORY_TO_OWASP[key] || key;
}

/** White-box workbench pins */
const WHITEBOX_ACCESS_LAB_IDS = new Set([18, 19]);
const WHITEBOX_XSS_ID_SET = new Set(WHITEBOX_XSS_LAB_IDS);

/**
 * Derive OWASP category key from lab title/name and optional lab_id.
 */
export function getCategoryFromLabTitle(labTitle, labId) {
  const id = labId != null && labId !== "" ? Number(labId) : NaN;
  if (PINNED_A04_GAME_LAB_IDS.has(id)) {
    return "a04_insecure_design";
  }
  if (!Number.isNaN(id) && WHITEBOX_ACCESS_LAB_IDS.has(id)) {
    return "a01_broken_access_control";
  }
  if (!Number.isNaN(id) && id === WHITEBOX_SQL_LAB_ID) {
    return "a03_injection";
  }
  if (!Number.isNaN(id) && WHITEBOX_XSS_ID_SET.has(id)) {
    return "a03_injection";
  }
  if (id === 1) {
    return "a03_injection";
  }
  if (!labTitle || typeof labTitle !== "string") {
    return "a01_broken_access_control";
  }
  const upper = labTitle.toUpperCase();

  for (const config of OWASP_TOP_10) {
    if (config.keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return config.key;
    }
  }

  return "a01_broken_access_control";
}

/**
 * OWASP Top 10 rows plus extra "folders" for proposal categories not in the Top 10 list.
 */
export function getCategoriesWithLabs(labs) {
  const counts = {};
  OWASP_CATEGORY_ORDER.forEach((k) => {
    counts[k] = 0;
  });
  const dynamicCounts = {};

  labs.forEach((lab) => {
    const key = getCategoryKeyForLab(lab);
    if (OWASP_KEY_SET.has(key)) {
      if (counts[key] != null) counts[key] += 1;
      return;
    }
    dynamicCounts[key] = (dynamicCounts[key] || 0) + 1;
  });

  const base = OWASP_TOP_10.map((config) => ({
    key: config.key,
    label: `${config.code}: ${config.label}`,
    shortLabel: config.label,
    code: config.code,
    icon: config.icon,
    labCount: counts[config.key] || 0,
    isDynamic: false,
  }));

  const extraKeys = Object.keys(dynamicCounts).sort();
  const extras = extraKeys.map((key) => ({
    key,
    label: `Other: ${formatDynamicCategoryLabel(key)}`,
    shortLabel: formatDynamicCategoryLabel(key),
    code: "—",
    icon: "📁",
    labCount: dynamicCounts[key] || 0,
    isDynamic: true,
  }));

  return [...base, ...extras];
}

/** @deprecated use OWASP_CATEGORY_ORDER */
export const WHITEBOX_CATEGORY_ORDER = OWASP_CATEGORY_ORDER;
