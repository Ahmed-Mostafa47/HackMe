/** Dedicated SQL white-box lab id (black-box SQL injection remains lab 1). */
export const WHITEBOX_SQL_LAB_ID = 11;

/** Additional SQL white-box cards (display + routing). */
export const WHITEBOX_SQL_EXTRA_LAB_IDS = [12];

export const WHITEBOX_ACCESS_LAB_IDS = [18, 19];
export const WHITEBOX_XSS_LAB_IDS = [20, 21];

/** White-box workbench lab ids (UI routing + grouping). */
export const WHITEBOX_WORKBENCH_LAB_IDS = [
  WHITEBOX_SQL_LAB_ID,
  ...WHITEBOX_SQL_EXTRA_LAB_IDS,
  ...WHITEBOX_ACCESS_LAB_IDS,
  ...WHITEBOX_XSS_LAB_IDS,
];
