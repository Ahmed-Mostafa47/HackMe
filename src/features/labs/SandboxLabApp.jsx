import React, { useEffect } from "react";

/**
 * Sandbox lab runs on localhost:4000 (Labs project).
 * This component redirects /lab-sandbox?labId=X&token=Y to the actual lab URL.
 */
const SandboxLabApp = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const labId = params.get("labId");
    const token = params.get("token");
    const targetUrl = labId && token
      ? `http://localhost:4000/?labId=${labId}&token=${encodeURIComponent(token)}`
      : `http://localhost:4000/?${params.toString()}`;
    window.location.href = targetUrl;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500/50 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-mono text-slate-400">Redirecting to lab...</p>
      </div>
    </div>
  );
};

export default SandboxLabApp;
