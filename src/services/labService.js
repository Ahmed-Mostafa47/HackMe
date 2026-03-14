/**
 * Lab Service - fetches labs from API or returns mock data
 */

const API_BASE = "http://localhost/HackMe/server/api/labs";

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

export const labService = {
  async getLabs() {
    try {
      // In dev, use /api so Vite proxy routes to HackMe backend
      const url = typeof import.meta !== "undefined" && import.meta.env?.DEV
        ? "/api/labs/get_labs.php"
        : `${getApiBase()}/get_labs.php`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data?.data?.labs?.length) {
        return data;
      }
      // API error or empty - merge with registered labs from mockData (lab 1, 5 with correct ports)
      const { mockLabs } = await import("../data/mockData");
      const registered = mockLabs.filter((l) => l.lab_id === 1 || l.lab_id === 5 || l.lab_id === 6 || l.lab_id === 7);
      return { success: true, data: { labs: registered.length ? registered : mockLabs } };
    } catch (error) {
      console.warn("LabService: API unavailable, using mock data:", error?.message);
      const { mockLabs } = await import("../data/mockData");
      const registered = mockLabs.filter((l) => l.lab_id === 1 || l.lab_id === 5 || l.lab_id === 6 || l.lab_id === 7);
      return { success: true, data: { labs: registered.length ? registered : mockLabs } };
    }
  },
};

export default labService;
