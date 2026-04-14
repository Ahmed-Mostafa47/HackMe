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

/** Same shape as GET get_lab_details.php `data.lab` for UI compatibility */
function mockLabToDetailsPayload(lab) {
  if (!lab) return null;
  const hints = Array.isArray(lab.hints)
    ? lab.hints.map((h) => String(h).trim()).filter(Boolean)
    : [];
  return {
    success: true,
    message: "OK",
    data: {
      lab: {
        lab_id: Number(lab.lab_id) || 0,
        title: String(lab.display_name ?? lab.title ?? ""),
        description: String(lab.description ?? ""),
        icon: String(lab.icon ?? "LAB"),
        port: lab.port != null ? Number(lab.port) : null,
        launch_path: String(lab.launch_path ?? ""),
        labtype_id: Number(lab.labtype_id) || 0,
        difficulty: String(lab.difficulty ?? "easy"),
        points_total: Number(lab.points_total) || 0,
        is_published: lab.is_published !== false,
        visibility: String(lab.visibility ?? "public"),
        has_solution: !!(lab.solution && String(lab.solution).trim()),
        hints,
      },
    },
  };
}

async function getLabDetailsFromMock(labId) {
  const { mockLabs } = await import("../data/mockData");
  const id = Number(labId);
  const lab = mockLabs.find((l) => Number(l.lab_id) === id);
  const payload = mockLabToDetailsPayload(lab);
  if (!payload) {
    throw new Error("Lab not found");
  }
  return payload;
}

export const labService = {
  async getLabs() {
    try {
      const response = await fetch(`${getLabsBase()}/get_labs.php`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || `Failed to load labs (${response.status})`
        );
      }

      if (Array.isArray(data?.data?.labs) && data.data.labs.length > 0) {
        const labs = data.data.labs;
        const hasLab1 = labs.some((l) => Number(l?.lab_id) === 1);
        if (!hasLab1) {
          const { mockLabs } = await import("../data/mockData");
          const fromMock = mockLabs.find((l) => Number(l.lab_id) === 1);
          if (fromMock) {
            labs.push({ ...fromMock });
            labs.sort((a, b) => Number(a.lab_id) - Number(b.lab_id));
          }
        }
        for (const lab of labs) {
          if (Number(lab?.lab_id) === 1) {
            lab.labtype_id = 1;
          }
        }
        return data;
      }

      // API empty - fall back to mock labs (registered subset preferred)
      const { mockLabs } = await import("../data/mockData");
      const registered = mockLabs.filter(
        (l) =>
          l.lab_id === 1 ||
          l.lab_id === 5 ||
          l.lab_id === 7 ||
          l.lab_id === 8 ||
          l.lab_id === 9 ||
          l.lab_id === 10
      );
      return {
        success: true,
        data: { labs: registered.length ? registered : mockLabs },
      };
    } catch (error) {
      console.warn("LabService: API unavailable, using mock data:", error?.message);
      const { mockLabs } = await import("../data/mockData");
      const registered = mockLabs.filter(
        (l) =>
          l.lab_id === 1 ||
          l.lab_id === 5 ||
          l.lab_id === 7 ||
          l.lab_id === 8 ||
          l.lab_id === 9 ||
          l.lab_id === 10
      );
      return {
        success: true,
        data: { labs: registered.length ? registered : mockLabs },
      };
    }
  },

  async getLabDetails(labId) {
    try {
      const response = await fetch(
        `${getLabsBase()}/get_lab_details.php?lab_id=${encodeURIComponent(labId)}`,
        { cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        return data;
      }
      // DB down, or lab missing from DB while list came from mock — use mock details
      if (
        data?.message === "Lab not found" ||
        data?.message === "Load error" ||
        !response.ok
      ) {
        return await getLabDetailsFromMock(labId);
      }
      throw new Error(
        data?.message || `Failed to load lab details (${response.status})`
      );
    } catch (err) {
      if (err?.message === "Lab not found") throw err;
      console.warn("LabService: getLabDetails API failed, trying mock:", err?.message);
      return await getLabDetailsFromMock(labId);
    }
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

  async getWhiteboxLab({ labId, userId }) {
    const response = await fetch(
      `${getLabsBase()}/get_whitebox_lab.php?lab_id=${encodeURIComponent(labId)}&user_id=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `White-box lab unavailable (${response.status})`);
    }
    return data;
  },

  async submitWhiteboxFix({ labId, userId, accessToken, sourceFile, line, replacementCode }) {
    const response = await fetch(`${getLabsBase()}/submit_whitebox_fix.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lab_id: labId,
        user_id: userId,
        access_token: accessToken || "",
        source_file: sourceFile,
        line,
        replacement_code: replacementCode,
      }),
    });
    return response.json().catch(() => ({}));
  },
};

export default labService;
