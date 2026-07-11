import { useEffect, useRef, useState } from 'react';
import { renderQrCanvas } from '../utils/qrEngine.js';
import { loadAuthenticatedImage } from '../utils/designHelpers.js';
import './QRCanvas.css';

/**
 * Renders a live, fully-styled preview of a QR code (patterns, corners,
 * colors, logo, frame) onto a <canvas>. Re-renders whenever the data or
 * design changes — this is the single source of truth for "what the QR
 * looks like", shared by the design studio, the QR detail page, and the
 * collection grid thumbnails.
 */
export default function QRCanvas({ data, design, logoPath, frameImagePath, qrName = '', qrPixelSize = 320, className = '' }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const designKey = JSON.stringify(design || {});

  useEffect(() => {
    let cancelled = false;
    let revokeLogo = () => {};
    let revokeFrame = () => {};

    async function run() {
      setError('');
      try {
        const [{ image, revoke }, { image: frameImage, revoke: revokeFrameFn }] = await Promise.all([
          loadAuthenticatedImage(logoPath),
          loadAuthenticatedImage(frameImagePath)
        ]);
        revokeLogo = revoke;
        revokeFrame = revokeFrameFn;
        if (cancelled) { revoke(); revokeFrameFn(); return; }

        const rendered = await renderQrCanvas({
          data: data || ' ',
          design,
          logoImageEl: image,
          frameImageEl: frameImage,
          qrName,
          qrPixelSize
        });
        if (cancelled) return;

        const target = canvasRef.current;
        if (!target) return;
        target.width = rendered.width;
        target.height = rendered.height;
        const ctx = target.getContext('2d');
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(rendered, 0, 0);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not render QR preview.');
      }
    }

    run();
    return () => { cancelled = true; revokeLogo(); revokeFrame(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, designKey, logoPath, frameImagePath, qrName, qrPixelSize]);

  return (
    <div className={`qr-canvas-frame ${className}`}>
      <canvas ref={canvasRef} />
      {error && <div className="qr-canvas-error">{error}</div>}
    </div>
  );
}
