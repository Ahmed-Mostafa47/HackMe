import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

/**
 * Contact form modal that fetches SuperAdmin recipients and submits email requests.
 */
export default function ContactUsModal({ open, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSubmitMessage("");
    setSubmitError("");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/contact_superadmins.php`);
        const raw = await res.text();
        let data = {};
        try {
          data = JSON.parse(raw);
        } catch (_) {
          data = {};
        }
        if (cancelled) return;
        if (res.ok && data.success && Array.isArray(data.contacts)) {
          setContacts(data.contacts);
          setCaptchaQuestion(data?.captcha?.question || "");
          setCaptchaToken(data?.captcha?.token || "");
        } else {
          const fallback =
            raw && raw.trim() ? `Server error (${res.status}): ${raw.slice(0, 120)}` : `Server error (${res.status})`;
          setError(data.message || fallback || "Could not load contact details");
          setContacts([]);
          setCaptchaQuestion("");
          setCaptchaToken("");
        }
      } catch (e) {
        if (!cancelled) {
          setError("Cannot reach server");
          setContacts([]);
          setCaptchaQuestion("");
          setCaptchaToken("");
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

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitMessage("");
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contact_superadmins.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          captcha_token: captchaToken,
          captcha_answer: captchaAnswer,
        }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = {};
      }
      if (data?.next_captcha?.question && data?.next_captcha?.token) {
        setCaptchaQuestion(data.next_captcha.question);
        setCaptchaToken(data.next_captcha.token);
        setCaptchaAnswer("");
      }
      if (res.ok && data?.success) {
        setSubmitMessage(data.message || "Message sent.");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        const fallback =
          raw && raw.trim() ? `Server error (${res.status}): ${raw.slice(0, 120)}` : `Server error (${res.status})`;
        setSubmitError(data?.message || fallback || "Failed to send message.");
      }
    } catch (_) {
      setSubmitError("Cannot reach server.");
    } finally {
      setSubmitting(false);
    }
  };

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
          Send a message to the SuperAdmin team:
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            required
            value={form.name}
            onChange={handleChange("name")}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={handleChange("email")}
            placeholder="Your email"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
          />
          <input
            type="text"
            required
            value={form.subject}
            onChange={handleChange("subject")}
            placeholder="Subject"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
          />
          <textarea
            required
            rows={4}
            value={form.message}
            onChange={handleChange("message")}
            placeholder="Your message"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
          />
          <label className="block font-mono text-xs text-gray-400">
            CAPTCHA: {captchaQuestion || "Loading challenge..."}
          </label>
          <input
            type="text"
            required
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            placeholder="Enter captcha answer"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !captchaToken || !captchaQuestion}
            className="w-full rounded-lg border border-green-600 bg-green-700/80 px-4 py-2 font-mono text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send to SuperAdmins"}
          </button>
          {submitMessage ? (
            <p className="font-mono text-xs text-green-400">{submitMessage}</p>
          ) : null}
          {submitError ? (
            <p className="font-mono text-xs text-red-400">{submitError}</p>
          ) : null}
        </form>
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
