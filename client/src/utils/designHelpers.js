// Small helpers that sit between the API layer and the pure canvas engine
// in qrEngine.js: figuring out which design applies to a given QR, and
// loading (auth-protected) logo images into <img> elements for canvas use.

import { api } from '../api/http.js';
import { resolveEffectiveDesign } from './qrEngine.js';

/**
 * Determines the design that should actually be rendered for a QR code, plus
 * the API path (if any) for its logo image.
 *
 * - If the QR has opted into a custom design and that design has its own
 *   logo, the QR's own logo endpoint is used.
 * - Otherwise, if the collection has a default logo, that one is used.
 */
export function resolveDesignAndLogoUrl(qr, collectionDesign) {
  const useCustom = !!qr?.useCustomDesign;
  const design = resolveEffectiveDesign(collectionDesign, qr?.design, useCustom);

  let logoPath = null;
  if (useCustom) {
    if (qr?.design?.logo) logoPath = `/qrcodes/${qr._id}/design/logo`;
  } else if (collectionDesign?.logo) {
    const collectionId = qr?.collectionId || qr?.collection;
    if (collectionId) logoPath = `/collections/${collectionId}/design/logo`;
  }

  return { design, logoPath };
}

/**
 * Fetches an auth-protected image endpoint as a blob and resolves an
 * <img> element ready to be drawn onto a canvas. Returns { image, revoke }
 * — call revoke() once you're done with the image to free the object URL.
 *
 * `path` may either be a server API path (e.g. "/qrcodes/:id/design/logo",
 * fetched with the auth header) or an already-usable URL such as a local
 * "blob:" URL from a freshly-picked file — those are loaded directly.
 */
export async function loadAuthenticatedImage(path) {
  if (!path) return { image: null, revoke: () => {} };

  const isDirectlyUsableUrl = /^(blob:|data:|https?:)/i.test(path);
  if (isDirectlyUsableUrl) {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load logo image.'));
      img.src = path;
    });
    return { image, revoke: () => {} };
  }

  const res = await api.get(path, { responseType: 'blob', __silent: true });
  const objectUrl = URL.createObjectURL(res.data);
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load logo image.'));
    img.src = objectUrl;
  });
  return { image, revoke: () => URL.revokeObjectURL(objectUrl) };
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeFileName(value, fallback = 'qr-code') {
  const cleaned = String(value || fallback).trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}
