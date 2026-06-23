import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Download, ExternalLink, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { api, fileUrl } from '../api/http.js';
import { formatBytes } from '../utils/format.js';
import './Viewer.css';

export default function Viewer() {
  const { token } = useParams();
  const [vault, setVault] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const contentRef = useRef(null);

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

    if (!file || !canPreview) return () => {};

    fetch(src, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setFileError('This file has been deleted, removed, or is no longer available.');
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

  if (status === 'loading') {
    return <main className="viewer-page"><div className="viewer-loading"><span className="spinner" /> Loading secure vault...</div></main>;
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
            <button className={active === index ? 'active' : ''} key={item.id} onClick={() => {
              if (active !== index) setFileLoading(true);
              setFileError('');
              setActive(index);
              setZoom(1);
            }}>
              <strong>{item.originalName}</strong>
              {/* <span>{item.originalName}</span> */}
            </button>
          ))}
        </aside>
        <section className="viewer-content">
          {file ? (
            <>
              <div className="viewer-toolbar">
                <div>
                  <strong>{file.originalName}</strong>
                  <span>{file.category} - {formatBytes(file.sizeBytes)}</span>
                </div>
                <div className="button-row-view">
                  {!fileError && (file.category === 'image' || file.category === 'pdf') && <button className="icon-button" onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} title="Zoom out"><ZoomOut size={18} /></button>}
                  {!fileError && (file.category === 'image' || file.category === 'pdf') && <button className="icon-button" onClick={() => setZoom(Math.min(2.5, zoom + 0.2))} title="Zoom in"><ZoomIn size={18} /></button>}
                  <button className="icon-button" onClick={fullscreen} title="Fullscreen"><Maximize size={18} /></button>
                  {!fileError && <a className="primary-button" href={fileUrl(file.downloadUrl)}><Download size={18} /> Download</a>}
                </div>
              </div>
              <div className="viewer-stage" ref={contentRef}>
                {fileLoading && <div className="viewer-stage-loading"><span className="spinner" /> Loading file...</div>}
                {fileError && (
                  <div className="file-missing-state">
                    <AlertTriangle size={34} />
                    <strong>File Not Found</strong>
                    <span>{fileError}</span>
                  </div>
                )}
                {!fileError && file.category === 'image' && <img src={src} style={{ transform: `scale(${zoom})` }} alt={file.originalName} onLoad={() => setFileLoading(false)} onError={() => { setFileError('This image has been deleted, removed, or is no longer available.'); setFileLoading(false); }} />}
                {!fileError && file.category === 'video' && <video src={src} controls playsInline onLoadedData={() => setFileLoading(false)} onError={() => { setFileError('This video has been deleted, removed, or is no longer available.'); setFileLoading(false); }} />}
                {!fileError && file.category === 'audio' && <audio src={src} controls onLoadedMetadata={() => setFileLoading(false)} onError={() => { setFileError('This audio file has been deleted, removed, or is no longer available.'); setFileLoading(false); }} />}
                {!fileError && file.category === 'pdf' && <iframe src={src} title={file.originalName} style={{ transform: `scale(${zoom})` }} onLoad={() => setFileLoading(false)} />}
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
      {vault.uploads.length > 1 && (
        <nav className="mobile-file-nav">
          {vault.uploads.map((item, index) => (
            <button className={active === index ? 'active' : ''} key={item.id} onClick={() => {
              if (active !== index) setFileLoading(true);
              setFileError('');
              setActive(index);
              setZoom(1);
            }}>
              <strong>{item.originalName}</strong>
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
