import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

/**
 * SuperAdmin contact emails (public GET). Used on landing and in the logged-in account menu.
 */
export default function ContactUsModal({ open, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/contact_superadmins.php`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        } else {
          setError(data.message || "Could not load contact details");
          setContacts([]);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Cannot reach server");
          setContacts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-dialog-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900/95 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
          onClick={onClose}
          aria-label="Close contact dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="contact-dialog-title" className="pr-10 font-mono text-lg font-bold text-green-400">
          // CONTACT_US
        </h2>
        <p className="mt-1 font-mono text-sm text-gray-500">
          SuperAdmin team — direct email addresses:
        </p>
        {loading && (
          <p className="mt-6 font-mono text-sm text-gray-400">Loading contacts…</p>
        )}
        {!loading && error && (
          <p className="mt-4 font-mono text-sm text-red-400">{error}</p>
        )}
        {!loading && !error && contacts.length === 0 && (
          <p className="mt-4 font-mono text-sm text-gray-400">
            No SuperAdmin contacts are available right now.
          </p>
        )}
        {!loading && contacts.length > 0 && (
          <ul className="mt-4 space-y-3">
            {contacts.map((c, i) => (
              <li
                key={`${c.email}-${i}`}
                className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-3"
              >
                {c.username ? (
                  <div className="mb-1 font-mono text-xs text-gray-400">{c.username}</div>
                ) : null}
                <a
                  href={`mailto:${encodeURIComponent(c.email)}`}
                  className="break-all font-mono text-sm text-green-400 hover:underline"
                >
                  {c.email}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
