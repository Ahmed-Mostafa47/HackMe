/**
 * Session user persisted by useAuth as `cyberops_user`.
 * `currentUser` is a legacy key kept for backward compatibility.
 */
const STORAGE_KEYS = ["cyberops_user", "currentUser"];

export function getStoredUser() {
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      /* try next key */
    }
  }
  return {};
}

export function getStoredUserId() {
  const u = getStoredUser();
  return Number(u?.user_id || u?.id || 0);
}
