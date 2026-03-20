/**
 * Lab Service - API-only labs data source.
 */

export const getHackMeBase = () => {
  if (typeof window === "undefined") return "http://localhost/HackMe";
  const origin = window.location.origin;
  const path = window.location.pathname;
  if (path.startsWith("/HackMe")) return origin + "/HackMe";
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin) && origin !== "http://localhost" && origin !== "http://localhost:80") {
    return "http://localhost/HackMe";
  }
  return origin + "/HackMe";
};

const getApiBase = () => getHackMeBase() + "/server/api/labs";

const getLabsBase = () =>
  typeof import.meta !== "undefined" && import.meta.env?.DEV
    ? "/api/labs"
    : getApiBase();

export const labService = {
  async getLabs() {
    const response = await fetch(`${getLabsBase()}/get_labs.php`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to load labs (${response.status})`);
    }
    return data;
  },

  async getLabDetails(labId) {
    const response = await fetch(
      `${getLabsBase()}/get_lab_details.php?lab_id=${encodeURIComponent(labId)}`,
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to load lab details (${response.status})`);
    }
    return data;
  },

  async getLabSolution({ labId, userId }) {
    const response = await fetch(`${getLabsBase()}/get_solution.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab_id: labId, user_id: userId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to load solution (${response.status})`);
    }
    return data;
  },
};

export default labService;
