import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Download, ExternalLink, Maximize } from 'lucide-react';
import { api, fileUrl } from '../api/http.js';
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
  const contentRef = useRef(null);
  const swipeRef = useRef({ x: 0, y: 0, time: 0, active: false });

  useEffect(() => {
    let mounted = true;
    setStatus('loading');
    setMessage('');
    setVault(null);

    api
      .get(`/vault/${token}`)
      .then((res) => {
        if (!mounted) return;
        if (res.data.status === 'deleted' || res.data.status === 'inactive') {
          setStatus(res.data.status);
          setMessage(res.data.message || 'This QR code is not available.');
          return;
        }
        setVault(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus(err.response?.status === 404 ? 'missing' : 'error');
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const file = vault?.uploads?.[active];
  const src = useMemo(() => (file ? fileUrl(file.viewUrl) : ''), [file]);

  useEffect(() => {
    let cancelled = false;
    const canPreview = Boolean(file && (file.category !== 'document' || file.previewable));

    setFileError('');
    setFileLoading(canPreview);

    if (!file || !canPreview) return () => { };

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

    return () => {
      cancelled = true;
    };
  }, [file?.id, file?.category, file?.previewable, src]);

  function fullscreen() {
    contentRef.current?.requestFullscreen?.();
  }

  function selectFile(index) {
    if (!vault?.uploads?.[index]) return;
    if (active !== index) setFileLoading(true);
    setFileError('');
    setActive(index);
  }

  function onTouchStart(event) {
    if (vault?.uploads?.length < 2) return;
    const touch = event.touches[0];
    swipeRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      active: true
    };
  }

  function onTouchEnd(event) {
    const swipe = swipeRef.current;
    swipeRef.current = { x: 0, y: 0, time: 0, active: false };
    if (!swipe.active || vault?.uploads?.length < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipe.x;
    const deltaY = touch.clientY - swipe.y;
    const elapsed = Date.now() - swipe.time;

    // More lenient swipe detection: 40px min distance or 60px/s velocity
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
          <div className="loader-spinner">
            <span className="spinner" />
          </div>
          <span>Loading secure vault...</span>
        </div>
      </main>
    );
  }

  if (status === 'deleted' || status === 'inactive' || status === 'missing') {
    const title = status === 'deleted' ? 'QR Code Deleted' : 'QR Content Unavailable';
    const text = message || 'This QR code is currently not available.';
    return (
      <main className="viewer-page viewer-status-page">
        <section className="viewer-status-card">
          <AlertTriangle size={42} />
          <h1>{title}</h1>
          <p>{text}</p>
        </section>
      </main>
    );
  }

  if (status === 'error' || !vault) {
    return (
      <main className="viewer-page viewer-status-page">
        <section className="viewer-status-card">
          <AlertTriangle size={42} />
          <h1>Unable To Open QR</h1>
          <p>Please check your connection and try scanning again.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <h1 style={{ textTransform: 'capitalize' }}>{vault.qr.name}</h1>
      </header>
      <section className="viewer-layout">
        <aside className="viewer-list">
          {vault.uploads.map((item, index) => (
            <button className={active === index ? 'active' : ''} key={item.id} onClick={() => selectFile(index)}>
              <strong>File {index + 1}</strong>
              <span>{item.originalName}</span>
            </button>
          ))}
        </aside>
        <section className="viewer-content" onTouchStartCapture={onTouchStart} onTouchEndCapture={onTouchEnd}>
          {file ? (
            <>
              <div className="viewer-toolbar">
                <div className="toolbar-info">
                  <strong>{file.originalName}</strong>
                  <span>{file.category} - {formatBytes(file.sizeBytes)}</span>
                </div>
                <div className="toolbar-actions">
                  <button className="icon-button" onClick={fullscreen} title="Fullscreen"><Maximize size={18} /></button>
                  {!fileError && <a className="icon-button" href={fileUrl(file.downloadUrl)} title="Download"><Download size={18} /></a>}
                </div>
              </div>
              <div className="viewer-stage" ref={contentRef}>
                {fileLoading && (
                  <div className="viewer-stage-loading">
                    <div className="loader-pulse" />
                    <span>Loading file...</span>
                  </div>
                )}
                {fileError && (
                  <div className="file-missing-state">
                    <AlertTriangle size={34} />
                    <strong>File Not Found</strong>
                    <span>{fileError}</span>
                  </div>
                )}
                {!fileError && file.category === 'image' && <img src={src} alt={file.originalName} onLoad={() => setFileLoading(false)} onError={() => { setFileError('This image has been deleted, removed, or is no longer available.'); setFileLoading(false); }} />}
                {!fileError && file.category === 'video' && <video src={src} controls playsInline onLoadedData={() => setFileLoading(false)} onError={() => { setFileError('This video has been deleted, removed, or is no longer available.'); setFileLoading(false); }} />}
                {!fileError && file.category === 'audio' && <audio src={src} controls onLoadedMetadata={() => setFileLoading(false)} onError={() => { setFileError('This audio file has been deleted, removed, or is no longer available.'); setFileLoading(false); }} />}
                {!fileError && file.category === 'pdf' && (
                  <object className="pdf-viewer-frame" data={src} type="application/pdf" onLoad={() => setFileLoading(false)}>
                    <div className="document-fallback">
                      <ExternalLink size={34} />
                      <strong>PDF preview is not available on this device.</strong>
                      <a className="primary-button" href={src} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Open PDF</a>
                    </div>
                  </object>
                )}
                {!fileError && file.category === 'document' && file.previewable && <iframe src={src} title={file.originalName} onLoad={() => setFileLoading(false)} />}
                {!fileError && file.category === 'document' && !file.previewable && (
                  <div className="document-fallback">
                    <ExternalLink size={34} />
                    <strong>Preview is not available for this document type.</strong>
                    <a className="primary-button" href={fileUrl(file.downloadUrl)}><Download size={18} /> Download</a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-viewer">No files are currently attached to this QR.</div>
          )}
        </section>
      </section>
      {/* mobile file navigation */}
      {vault.uploads.length > 1 && (
        <nav className="mobile-file-nav">
          {vault.uploads.map((item, index) => (
            <button className={active === index ? 'active' : ''} key={item.id} onClick={() => selectFile(index)} aria-label={`Show file ${index + 1}`}>
              <span className="mobile-file-dot" />
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
