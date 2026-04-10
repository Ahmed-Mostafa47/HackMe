/**
 * Lab category mapping - derives vulnerability category from lab name/title
 * Used to group labs into folder-like categories (SQL Injection, XSS, Broken Access, etc.)
 */

export const LAB_CATEGORIES = {
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
    keywords: ["access", "idor", "authorization", "privilege", "bypass"],
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
  GENERAL: {
    key: "general",
    label: "General",
    icon: "📁",
    keywords: [],
  },
};

/**
 * Derive category key from lab title/name
 * @param {string} labTitle - Lab title or name (e.g. "SQL_INJECTION_SOURCE_ANALYSIS", "REFLECTED_XSS_BLOG_LAB")
 * @returns {string} Category key
 */
export function getCategoryFromLabTitle(labTitle) {
  if (!labTitle || typeof labTitle !== "string") return LAB_CATEGORIES.GENERAL.key;
  const upper = labTitle.toUpperCase();

  for (const [catKey, config] of Object.entries(LAB_CATEGORIES)) {
    if (catKey === "GENERAL") continue;
    if (config.keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return config.key;
    }
  }

  return LAB_CATEGORIES.GENERAL.key;
}

/**
 * Get all category configs that have at least one lab
 * @param {Array} labs - List of labs
 * @returns {Array} Category configs with lab count
 */
export function getCategoriesWithLabs(labs) {
  const counts = {};
  labs.forEach((lab) => {
    const key = getCategoryFromLabTitle(lab.title);
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(LAB_CATEGORIES)
    .filter(([, config]) => (counts[config.key] || 0) > 0)
    .map(([, config]) => ({
      ...config,
      labCount: counts[config.key] || 0,
    }));
}
