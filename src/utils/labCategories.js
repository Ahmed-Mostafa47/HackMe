/**
 * Lab category mapping - derives vulnerability category from lab name/title
 * Used to group labs into folder-like categories (SQL Injection, XSS, Broken Access, etc.)
 */

import { WHITEBOX_SQL_LAB_ID, WHITEBOX_XSS_LAB_IDS } from "../constants/labs";

export const LAB_CATEGORIES = {
  GAME: {
    key: "game",
    label: "Game",
    icon: "🎮",
    keywords: [
      "frogger",
      "sudoku",
      "hack the sudoku",
      "devtools",
      "override",
      "game",
      "games",
      "ctf",
      "arcade",
    ],
  },
  SQL_INJECTION: {
    key: "sql_injection",
    label: "SQL Injection",
    icon: "💉",
    keywords: ["sql", "sqli", "injection"],
  },
  XSS: {
    key: "xss",
    label: "XSS",
    icon: "⚡",
    keywords: ["xss", "cross-site", "scripting"],
  },
  BROKEN_ACCESS: {
    key: "broken_access",
    label: "Broken Access Control",
    icon: "🔓",
    keywords: [
      "broken",
      "access",
      "access_control",
      "idor",
      "authorization",
      "privilege",
      "bypass",
    ],
  },
  CSRF: {
    key: "csrf",
    label: "CSRF",
    icon: "🎭",
    keywords: ["csrf", "cross-site", "forgery"],
  },
  BUFFER_OVERFLOW: {
    key: "buffer_overflow",
    label: "Buffer Overflow",
    icon: "💥",
    keywords: ["buffer", "overflow", "overflow"],
  },
};

/** White-box access-control workbench labs (always grouped under Broken Access Control). */
const WHITEBOX_ACCESS_LAB_IDS = new Set([18, 19]);
const WHITEBOX_XSS_ID_SET = new Set(WHITEBOX_XSS_LAB_IDS);

/** White-box category sidebar order (SQL Injection before Broken Access Control). */
export const WHITEBOX_CATEGORY_ORDER = [
  "game",
  "sql_injection",
  "broken_access",
  "xss",
  "csrf",
  "buffer_overflow",
];

/**
 * Derive category key from lab title/name (and optional lab_id for known workbenches).
 * @param {string} labTitle - Lab title or name
 * @param {number|string|undefined} labId - When set, pins known white-box labs to the right folder
 * @returns {string} Category key
 */
export function getCategoryFromLabTitle(labTitle, labId) {
  const id = labId != null && labId !== "" ? Number(labId) : NaN;
  if (id === 40) {
    return LAB_CATEGORIES.GAME.key;
  }
  if (!Number.isNaN(id) && WHITEBOX_ACCESS_LAB_IDS.has(id)) {
    return LAB_CATEGORIES.BROKEN_ACCESS.key;
  }
  if (!Number.isNaN(id) && id === WHITEBOX_SQL_LAB_ID) {
    return LAB_CATEGORIES.SQL_INJECTION.key;
  }
  if (!Number.isNaN(id) && WHITEBOX_XSS_ID_SET.has(id)) {
    return LAB_CATEGORIES.XSS.key;
  }
  if (id === 1) {
    return LAB_CATEGORIES.SQL_INJECTION.key;
  }
  if (!labTitle || typeof labTitle !== "string") {
    return LAB_CATEGORIES.BROKEN_ACCESS.key;
  }
  const upper = labTitle.toUpperCase();

  for (const [, config] of Object.entries(LAB_CATEGORIES)) {
    if (config.keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return config.key;
    }
  }

  return LAB_CATEGORIES.BROKEN_ACCESS.key;
}

/**
 * Get all category configs that have at least one lab
 * @param {Array} labs - List of labs
 * @param {Object} [options]
 * @param {string[]} [options.includeEmptyKeys] - Category keys to include even with 0 labs
 * @returns {Array} Category configs with lab count
 */
export function getCategoriesWithLabs(labs, options = {}) {
  const includeEmptyKeys = new Set(options.includeEmptyKeys || []);
  const counts = {};
  labs.forEach((lab) => {
    const key = getCategoryFromLabTitle(lab.title, lab.lab_id);
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(LAB_CATEGORIES)
    .filter(([, config]) => (counts[config.key] || 0) > 0 || includeEmptyKeys.has(config.key))
    .map(([, config]) => ({
      ...config,
      labCount: counts[config.key] || 0,
    }));
}
