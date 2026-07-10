// Builds the actual downloadable artifacts (single PNG, a ZIP of PNGs, or a
// PDF sheet) by rendering each QR through the design engine client-side, so
// the exact same "Design QR Code" look shown in the preview is what gets
// downloaded — no separate server-side renderer to keep in sync.

import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { renderQrCanvas, canvasToBlob } from './qrEngine.js';
import { loadAuthenticatedImage, triggerBlobDownload, safeFileName } from './designHelpers.js';

const EXPORT_QR_PIXEL_SIZE = 640;

/**
 * Renders one QR and triggers a browser download of the resulting PNG.
 */
export async function downloadSingleQrPng({ vaultUrl, design, logoPath, filenameBase }) {
  const { image, revoke } = await loadAuthenticatedImage(logoPath);
  try {
    const canvas = await renderQrCanvas({
      data: vaultUrl,
      design,
      logoImageEl: image,
      qrPixelSize: EXPORT_QR_PIXEL_SIZE
    });
    const blob = await canvasToBlob(canvas);
    triggerBlobDownload(blob, `${safeFileName(filenameBase)}.png`);
  } finally {
    revoke();
  }
}

/**
 * Renders every QR in `qrs` using the SAME design (the collection's default),
 * so a bulk export always looks like one consistent, on-brand batch — and
 * zips the results.
 *
 * `qrs` items need: { name, vaultUrl }.
 */
export async function downloadCollectionZip({ qrs, design, logoPath, collectionName }) {
  const { image, revoke } = await loadAuthenticatedImage(logoPath);
  try {
    const zip = new JSZip();
    const usedNames = new Map();

    for (const qr of qrs) {
      const canvas = await renderQrCanvas({
        data: qr.vaultUrl,
        design,
        logoImageEl: image,
        qrPixelSize: EXPORT_QR_PIXEL_SIZE
      });
      const blob = await canvasToBlob(canvas);
      const base = safeFileName(qr.name);
      const count = usedNames.get(base) || 0;
      usedNames.set(base, count + 1);
      const filename = `${base}${count ? `-${count + 1}` : ''}.png`;
      zip.file(filename, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(zipBlob, `${safeFileName(collectionName, 'collection')}-qr-codes.zip`);
  } finally {
    revoke();
  }
}

/**
 * Same idea as the ZIP export, but lays every QR out on PDF pages (a grid of
 * cards with the QR's name printed underneath) instead.
 */
export async function downloadCollectionPdf({ qrs, design, logoPath, collectionName }) {
  const { image, revoke } = await loadAuthenticatedImage(logoPath);
  try {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 36;
    const cols = 2;
    const rows = 2;
    const cellW = (pageWidth - margin * 2) / cols;
    const cellH = (pageHeight - margin * 2) / rows;
    const cardSize = Math.min(cellW, cellH) - 44;

    let col = 0;
    let row = 0;
    let firstPage = true;

    for (const qr of qrs) {
      if (col === 0 && row === 0) {
        if (!firstPage) pdf.addPage();
        firstPage = false;
      }

      const canvas = await renderQrCanvas({
        data: qr.vaultUrl,
        design,
        logoImageEl: image,
        qrPixelSize: EXPORT_QR_PIXEL_SIZE
      });
      const dataUrl = canvas.toDataURL('image/png');

      const cellX = margin + col * cellW;
      const cellY = margin + row * cellH;
      const scale = cardSize / canvas.width;
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const imgX = cellX + (cellW - drawW) / 2;
      const imgY = cellY + (cellH - drawH) / 2 - 10;

      pdf.addImage(dataUrl, 'PNG', imgX, imgY, drawW, drawH);
      pdf.setFontSize(10);
      pdf.setTextColor('#4B5563');
      pdf.text(String(qr.name || ''), cellX + cellW / 2, cellY + cellH - 14, { align: 'center', maxWidth: cellW - 16 });

      col += 1;
      if (col >= cols) { col = 0; row += 1; }
      if (row >= rows) { row = 0; }
    }

    pdf.save(`${safeFileName(collectionName, 'collection')}-qr-codes.pdf`);
  } finally {
    revoke();
  }
}
