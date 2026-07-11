// Deliberately dependency-free: the viewer is what a visitor's phone loads
// the instant they scan a QR code, so every kilobyte here matters. Plain
// fetch instead of axios, no router, no icon library.

const isDev = import.meta.env.DEV;

export const API_URL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : import.meta.env.VITE_API_URL;

export const FILE_ORIGIN = isDev
  ? 'http://localhost:5000'
  : (API_URL ? API_URL.replace(/\/api$/, '') : window.location.origin);

export function fileUrl(path) {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  return `${FILE_ORIGIN}${path}`;
}

const REQUEST_TIMEOUT_MS = 20000;

/**
 * Fetches JSON from the API. Never throws for HTTP error responses — always
 * resolves with { ok, status, data } so callers can render a friendly state
 * instead of an uncaught rejection.
 */
export async function apiGet(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, { signal: controller.signal });
    let data = null;
    try { data = await res.json(); } catch { /* no JSON body */ }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, networkError: true, message: err.message };
  } finally {
    clearTimeout(timeout);
  }
}
