/**
 * Lab Service - API-only labs data source.
 */

import { WHITEBOX_SQL_LAB_ID, WHITEBOX_WORKBENCH_LAB_IDS } from "../constants/labs";
import { fetchHackMeMachineIdentity } from "../utils/hackmeIdentity";

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

const getClientLocalIp = async () => {
  try {
    const identity = await fetchHackMeMachineIdentity();
    return identity?.local_ipv4 || "";
  } catch {
    return "";
  }
};

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

/** Normalize approved-proposal markers from DB (legacy rows without extra columns). */
function applyProposalCatalogFields(lab) {
  if (!lab || typeof lab !== "object") return lab;
  const out = { ...lab };
  let desc = String(out.description ?? "");
  const m = desc.match(/^\[\[hackme_owasp:([A-Za-z0-9_]+)\]\]\s*(?:\r?\n){0,2}/);
  if (m && !String(out.owasp_category_key || "").trim()) {
    out.owasp_category_key = m[1];
    desc = desc.replace(/^\[\[hackme_owasp:[A-Za-z0-9_]+\]\]\s*(?:\r?\n){0,2}/, "");
  }
  out.description = desc;
  const lp = String(out.launch_path ?? "");
  if (lp === "__HACKME_SOON__") {
    out.launch_path = "";
    out.coming_soon = true;
  }
  return out;
}

/** Keep first row per lab_id (API can return duplicates; breaks OWASP buckets). */
function dedupeLabsById(labs) {
  const seen = new Set();
  const out = [];
  for (const lab of labs) {
    const id = Number(lab?.lab_id);
    if (Number.isNaN(id)) {
      out.push(lab);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(lab);
  }
  return out;
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
        const labs = data.data.labs.filter(
          (l) => !(Number(l?.lab_id) === 11 && WHITEBOX_SQL_LAB_ID !== 11)
        );
        const { mockLabs } = await import("../data/mockData");
        for (const id of [1, ...WHITEBOX_WORKBENCH_LAB_IDS, 40]) {
          if (!labs.some((l) => Number(l?.lab_id) === id)) {
            const fromMock = mockLabs.find((l) => Number(l.lab_id) === id);
            if (fromMock) {
              labs.push({ ...fromMock });
            }
          }
        }
        labs.sort((a, b) => Number(a.lab_id) - Number(b.lab_id));
        for (const lab of labs) {
          const id = Number(lab?.lab_id);
          if (WHITEBOX_WORKBENCH_LAB_IDS.includes(id)) {
            lab.labtype_id = 1;
          }
        }
        for (const mid of WHITEBOX_WORKBENCH_LAB_IDS) {
          if (!labs.some((l) => Number(l?.lab_id) === mid)) {
            const fromMock = mockLabs.find((l) => Number(l.lab_id) === mid);
            if (fromMock) {
              labs.push({ ...fromMock, labtype_id: 1 });
            }
          }
        }
        labs.sort((a, b) => Number(a.lab_id) - Number(b.lab_id));
        data.data.labs = dedupeLabsById(labs).map(applyProposalCatalogFields);
        return data;
      }

      // API empty - fall back to mock labs (registered subset preferred)
      const { mockLabs } = await import("../data/mockData");
      const registered = mockLabs.filter(
        (l) =>
          l.lab_id === 1 ||
          l.lab_id === WHITEBOX_SQL_LAB_ID ||
          l.lab_id === 5 ||
          l.lab_id === 7 ||
          l.lab_id === 8 ||
          l.lab_id === 9 ||
          l.lab_id === 10 ||
          l.lab_id === 40 ||
          l.lab_id === 41 ||
          l.lab_id === 18 ||
          l.lab_id === 19 ||
          l.lab_id === 20 ||
          l.lab_id === 21
      );
      return {
        success: true,
        data: { labs: registered.length ? registered : mockLabs },
      };
    } catch (error) {
      console.warn("LabService: API unavailable, using mock data:", error?.message);
      const { mockLabs } = await import("../data/mockData");
      const registeredFallback = mockLabs.filter(
        (l) =>
          l.lab_id === 1 ||
          l.lab_id === WHITEBOX_SQL_LAB_ID ||
          l.lab_id === 5 ||
          l.lab_id === 7 ||
          l.lab_id === 8 ||
          l.lab_id === 9 ||
          l.lab_id === 10 ||
          l.lab_id === 40 ||
          l.lab_id === 41 ||
          l.lab_id === 18 ||
          l.lab_id === 19 ||
          l.lab_id === 20 ||
          l.lab_id === 21
      );
      return {
        success: true,
        data: { labs: registeredFallback.length ? registeredFallback : mockLabs },
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
    const clientLocalIp = await getClientLocalIp();
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
        client_local_ip: clientLocalIp,
        client_time_utc: new Date().toISOString(),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        client_tz_offset_minutes: new Date().getTimezoneOffset(),
      }),
    });
    return response.json().catch(() => ({}));
  },

  async uploadLabZip({ file, userId }) {
    const formData = new FormData();
    formData.append("lab_zip", file);
    formData.append("user_id", String(userId || 0));
    const response = await fetch(`${getLabsBase()}/upload_lab_zip.php`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to upload ZIP (${response.status})`);
    }
    return data;
  },

  async finalizeLabUpload({ userId, uploadToken }) {
    const clientLocalIp = await getClientLocalIp();
    const response = await fetch(`${getLabsBase()}/finalize_lab_upload.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        upload_token: uploadToken,
        client_local_ip: clientLocalIp,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to finalize lab upload (${response.status})`);
    }
    return data;
  },

  async getLabDocument({ labId, kind }) {
    const response = await fetch(
      `${getLabsBase()}/get_lab_document.php?lab_id=${encodeURIComponent(labId)}&kind=${encodeURIComponent(kind)}`,
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to load document (${response.status})`);
    }
    return data;
  },

  async getLabSubmissionRequests({ userId }) {
    const response = await fetch(
      `${getLabsBase()}/get_lab_submission_requests.php?user_id=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || `Failed to load lab requests (${response.status})`);
    }
    return data;
  },

  async approveLabSubmission({ userId, submissionId }) {
    const clientLocalIp = await getClientLocalIp();
    const response = await fetch(`${getLabsBase()}/approve_lab_submission.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        submission_id: submissionId,
        client_local_ip: clientLocalIp,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || `Approve failed (${response.status})`);
    }
    return data;
  },

  async rejectLabSubmission({ userId, submissionId }) {
    const clientLocalIp = await getClientLocalIp();
    const response = await fetch(`${getLabsBase()}/reject_lab_submission.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        submission_id: submissionId,
        client_local_ip: clientLocalIp,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || `Reject failed (${response.status})`);
    }
    return data;
  },

  async downloadLabSubmissionZip({ userId, submissionId }) {
    const url = `${getLabsBase()}/download_lab_submission_zip.php?user_id=${encodeURIComponent(
      userId
    )}&submission_id=${encodeURIComponent(submissionId)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      let msg = `Download failed (${response.status})`;
      try {
        const j = await response.json();
        if (j?.message) msg = String(j.message);
      } catch {
        try {
          const t = await response.text();
          if (t) msg = t.slice(0, 200);
        } catch {
          /* ignore */
        }
      }
      throw new Error(msg);
    }
    return response.blob();
  },

  async submitLabProposal({
    userId,
    title,
    description,
    labtypeId,
    difficulty,
    pointsTotal,
    owaspCategory,
    hints,
    solution,
    uploadToken,
    zipOriginalName,
  }) {
    const clientLocalIp = await getClientLocalIp();
    const response = await fetch(`${getLabsBase()}/submit_lab_proposal.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title,
        description,
        labtype_id: labtypeId,
        difficulty,
        points_total: pointsTotal,
        owasp_category: owaspCategory,
        hints: hints ?? "",
        solution: solution ?? "",
        upload_token: uploadToken ?? "",
        zip_original_name: zipOriginalName ?? "",
        client_local_ip: clientLocalIp,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || `Failed to submit lab proposal (${response.status})`);
    }
    return data;
  },

  async updateLabMetadata({
    userId,
    labId,
    title,
    description,
    difficulty,
    pointsTotal,
    visibility,
    isPublished,
    icon,
    launchPath,
    port,
    labtypeId,
  }) {
    const clientLocalIp = await getClientLocalIp();
    const payload = {
      user_id: userId,
      lab_id: labId,
      title,
      description,
      difficulty,
      points_total: pointsTotal,
      visibility,
      is_published: isPublished,
      icon: icon ?? "",
      launch_path: launchPath ?? "",
      port: port ?? null,
      client_local_ip: clientLocalIp,
    };
    if (labtypeId != null && labtypeId !== "") {
      payload.labtype_id = Number(labtypeId);
    }
    const response = await fetch(`${getLabsBase()}/update_lab_metadata.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to update lab metadata (${response.status})`);
    }
    return data;
  },

  async deleteLab({ userId, labId }) {
    const clientLocalIp = await getClientLocalIp();
    const response = await fetch(`${getLabsBase()}/delete_lab.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        lab_id: labId,
        client_local_ip: clientLocalIp,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || `Failed to delete lab (${response.status})`);
    }
    return data;
  },
};

export default labService;
