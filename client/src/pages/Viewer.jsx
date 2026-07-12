import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Download, ExternalLink, WifiOff } from 'lucide-react';
import { api, fileUrl, getErrorMessage } from '../api/http.js';
import { formatBytes } from '../utils/format.js';
import './Viewer.css';

export default function Viewer() {
  const { token } = useParams();
  const [vault, setVault] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(0);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const stageRef = useRef(null);
  const swipeRef = useRef({ x: 0, y: 0, time: 0, active: false });

  useEffect(() => {
    let mounted = true;

    if (!token) {
      setStatus('missing');
      setMessage('This link is missing a QR code reference.');
      return undefined;
    }

    setStatus('loading');
    setMessage('');
    setVault(null);

    api.get(`/vault/${token}`, { __silent: true }).then((res) => {
      if (!mounted) return;
      const data = res.data;
      if (data.status === 'deleted' || data.status === 'inactive') {
        setStatus(data.status);
        setMessage(data.message || 'This QR code is not available.');
        return;
      }
      setVault(data);
      setStatus('ready');
    }).catch((err) => {
      if (!mounted) return;
      if (err.response?.status === 404) {
        setStatus('missing');
        setMessage(err.response?.data?.message || 'This QR code could not be found.');
        return;
      }
      setStatus('error');
      setMessage(getErrorMessage(err, 'Something went wrong loading this QR code.'));
    });

    return () => { mounted = false; };
  }, [token]);

  const file = vault?.uploads?.[active];
  const src = useMemo(() => (file ? fileUrl(file.viewUrl) : ''), [file]);

  useEffect(() => {
    let cancelled = false;
    const canPreview = Boolean(file && (file.category !== 'document' || file.previewable));

    setFileError('');
    setFileLoading(canPreview);

    if (!file || !canPreview) return undefined;

    fetch(src, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setFileError('This file has been deleted, removed, or is no longer available.');
          setFileLoading(false);
        } else if (file.category === 'pdf' || file.category === 'document') {
          setFileLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFileError('This file could not be loaded right now.');
        setFileLoading(false);
      });

    return () => { cancelled = true; };
  }, [file?.id, file?.category, file?.previewable, src]);

  function selectFile(index) {
    if (!vault?.uploads?.[index]) return;
    if (active !== index) setFileLoading(true);
    setFileError('');
    setActive(index);
  }

  // Swipe-to-switch is only enabled for plain images. Anything embedded via
  // an <iframe>/<object> (PDFs, documents, and native video/audio controls)
  // needs its own touch gestures for scrolling/seeking — hijacking those
  // with a capture-phase swipe handler is what made the old viewer feel
  // broken on mobile, since taps meant for the embedded content never
  // reached it.
  const swipeEnabled = vault?.uploads?.length > 1 && file?.category === 'image';

  function onTouchStart(event) {
    if (!swipeEnabled) return;
    const touch = event.touches[0];
    swipeRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), active: true };
  }

  function onTouchEnd(event) {
    if (!swipeEnabled) return;
    const swipe = swipeRef.current;
    swipeRef.current = { x: 0, y: 0, time: 0, active: false };
    if (!swipe.active) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipe.x;
    const deltaY = touch.clientY - swipe.y;
    const elapsed = Date.now() - swipe.time;

    const minDistance = 40;
    const velocity = Math.abs(deltaX) / (elapsed || 1);
    const horizontalSwipe = Math.abs(deltaX) > minDistance &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
      velocity > 0.15;

    if (!horizontalSwipe) return;
    const nextIndex = deltaX < 0 ? active + 1 : active - 1;
    selectFile(Math.min(Math.max(nextIndex, 0), vault.uploads.length - 1));
  }

  if (status === 'loading') {
    return (
      <main className="viewer-page">
        <div className="viewer-loading">
          <span className="spinner" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (status === 'deleted' || status === 'inactive' || status === 'missing') {
    const title = status === 'deleted' ? 'QR Code Deleted' : 'Content Unavailable';
    return (
      <main className="viewer-page viewer-status-page">
        <section className="viewer-status-card">
          <AlertTriangle size={40} />
          <h1>{title}</h1>
          <p>{message || 'This QR code is currently not available.'}</p>
        </section>
      </main>
    );
  }

  if (status === 'error' || !vault) {
    return (
      <main className="viewer-page viewer-status-page">
        <section className="viewer-status-card">
          {typeof navigator !== 'undefined' && !navigator.onLine ? <WifiOff size={40} /> : <AlertTriangle size={40} />}
          <h1>Unable To Open</h1>
          <p>{message || 'Please check your connection and try scanning again.'}</p>
        </section>
      </main>
    );
  }

  const hasMultipleFiles = vault.uploads.length > 1;

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <h1>{vault.qr.name}</h1>
      </header>

      {hasMultipleFiles && (
        <nav className="viewer-file-tabs" aria-label="Files in this QR code">
          {vault.uploads.map((item, index) => (
            <button
              key={item.id}
              className={active === index ? 'active' : ''}
              onClick={() => selectFile(index)}
            >
              {item.originalName}
            </button>
          ))}
        </nav>
      )}

      <section className="viewer-content">
        {file ? (
          <>
            <div className="viewer-toolbar">
              <div className="toolbar-info">
                <strong>{file.originalName}</strong>
                <span>{formatBytes(file.sizeBytes)}</span>
              </div>
              {!fileError && (
                <a className="icon-button" href={fileUrl(file.downloadUrl)} title="Download">
                  <Download size={18} />
                </a>
              )}
            </div>

            <div
              className="viewer-stage"
              ref={stageRef}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {fileLoading && (
                <div className="viewer-stage-loading">
                  <span className="spinner" />
                  <span>Loading file...</span>
                </div>
              )}

              {fileError && (
                <div className="file-missing-state">
                  <AlertTriangle size={32} />
                  <strong>File Not Found</strong>
                  <span>{fileError}</span>
                </div>
              )}

              {!fileError && file.category === 'image' && (
                <img
                  src={src}
                  alt={file.originalName}
                  onLoad={() => setFileLoading(false)}
                  onError={() => { setFileError('This image has been deleted, removed, or is no longer available.'); setFileLoading(false); }}
                />
              )}

              {!fileError && file.category === 'video' && (
                <video
                  src={src}
                  controls
                  playsInline
                  onLoadedData={() => setFileLoading(false)}
                  onError={() => { setFileError('This video has been deleted, removed, or is no longer available.'); setFileLoading(false); }}
                />
              )}

              {!fileError && file.category === 'audio' && (
                <div className="audio-stage">
                  <audio
                    src={src}
                    controls
                    onLoadedMetadata={() => setFileLoading(false)}
                    onError={() => { setFileError('This audio file has been deleted, removed, or is no longer available.'); setFileLoading(false); }}
                  />
                </div>
              )}

              {!fileError && (file.category === 'pdf' || (file.category === 'document' && file.previewable)) && (
                <>
                  <iframe className="doc-frame" src={src} title={file.originalName} onLoad={() => setFileLoading(false)} />
                  {/* Inline PDF/document rendering is unreliable on some mobile
                      browsers, so a reliable way out is always visible rather
                      than only appearing when the embed silently fails. */}
                  <a className="open-elsewhere-link" href={src} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Open in a new tab
                  </a>
                </>
              )}

              {!fileError && file.category === 'document' && !file.previewable && (
                <div className="document-fallback">
                  <ExternalLink size={32} />
                  <strong>Preview isn't available for this document type.</strong>
                  <a className="primary-button" href={fileUrl(file.downloadUrl)}><Download size={18} /> Download</a>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-viewer">No files are currently attached to this QR.</div>
        )}
      </section>
    </main>
  );
}
