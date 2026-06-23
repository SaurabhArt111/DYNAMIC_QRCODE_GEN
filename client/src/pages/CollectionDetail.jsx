import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Download, Trash, Search, FolderUp, FileText, CheckCircle2, XCircle, Loader
} from 'lucide-react';
import { api } from '../api/http.js';
import Modal from '../components/Modal.jsx';
import { formatBytes, formatDate } from '../utils/format.js';
import './CollectionDetail.css';

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [col, setCol] = useState(null);
  const [qrItems, setQrItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // Bulk folder state
  const [bulkFolders, setBulkFolders] = useState([]); // [{name, files:[]}]
  const [bulkParentName, setBulkParentName] = useState('');
  const [bulkSkippedFiles, setBulkSkippedFiles] = useState(0);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const folderInputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/collections/${id}/qrcodes`, { params: { search: query, limit: 50 } });
      setCol(data.collection);
      setQrItems(data.items);
    } catch {
      navigate('/collections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function createQr(e) {
    e.preventDefault();
    setBusy('create');
    setError('');
    try {
      await api.post('/qrcodes', { name: form.name, description: form.description, collectionId: id });
      setForm({ name: '', description: '' });
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create QR.');
    } finally {
      setBusy('');
    }
  }

  async function recycleQr(qrId) {
    if (!window.confirm('Recycle this QR?')) return;
    try {
      await api.delete(`/qrcodes/${qrId}`);
      await load();
    } catch {}
  }

  async function downloadQrImage(qr) {
    setBusy(`dl-${qr._id}`);
    try {
      const res = await api.get(`/qrcodes/${qr._id}/qr-image`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${qr.name}.png`; a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(''); }
  }

  // ---- Bulk folder logic ----
  function onFolderInput(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Group by the first child folder inside the selected parent folder.
    const map = {};
    let parentName = '';
    let skippedFiles = 0;

    for (const file of files) {
      const parts = (file.webkitRelativePath || file.name).split('/').filter(Boolean);
      if (!parentName && parts[0]) parentName = parts[0];

      if (parts.length < 3) {
        skippedFiles += 1;
        continue;
      }

      const folder = parts[1];
      if (!map[folder]) map[folder] = [];
      map[folder].push(file);
    }

    const folders = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, fls]) => ({
        name,
        files: fls.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name))
      }));

    setBulkFolders(folders);
    setBulkParentName(parentName);
    setBulkSkippedFiles(skippedFiles);
    setBulkResults(null);
    e.target.value = '';
  }

  function removeBulkFolder(name) {
    setBulkFolders((prev) => prev.filter((f) => f.name !== name));
  }

  async function runBulkCreate() {
    if (!bulkFolders.length) return;
    setBusy('bulk');
    setBulkProgress({ current: 0, total: bulkFolders.length });
    const results = [];

    for (let i = 0; i < bulkFolders.length; i++) {
      const folder = bulkFolders[i];
      setBulkProgress({ current: i + 1, total: bulkFolders.length, name: folder.name });
      try {
        const fd = new FormData();
        fd.append('collectionId', id);
        for (const file of folder.files) {
          fd.append(folder.name, file);
        }
        const { data } = await api.post('/qrcodes/bulk-folder', fd);
        if (data.items?.length) {
          results.push({ folder: folder.name, status: 'ok', qrName: data.items[0].name });
        } else {
          results.push({ folder: folder.name, status: 'error', message: 'No QR created.' });
        }
      } catch (err) {
        results.push({ folder: folder.name, status: 'error', message: err.response?.data?.message || 'Failed.' });
      }
    }

    setBulkResults(results);
    setBulkProgress(null);
    setBusy('');
    setBulkFolders([]);
    setBulkParentName('');
    setBulkSkippedFiles(0);
    await load();
  }

  if (!col && !loading) return null;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/collections')}><ArrowLeft size={16} /> Collections</button>
          <h1>{col?.name || '...'}</h1>
          {col?.description && <p>{col.description}</p>}
          {col?.defaultPdf && (
            <div className="col-pdf-indicator">
              <FileText size={14} /> Default PDF: <strong>{col.defaultPdf.originalName}</strong> — auto-attached to all QRs
            </div>
          )}
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={() => { setModal('bulk'); setBulkResults(null); setBulkFolders([]); setBulkParentName(''); setBulkSkippedFiles(0); }}>
            <FolderUp size={18} /> Bulk Create
          </button>
          <button className="primary-button" onClick={() => { setForm({ name: '', description: '' }); setError(''); setModal('create'); }}>
            <Plus size={18} /> Create QR
          </button>
        </div>
      </div>

      <div className="qr-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search QR codes" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <button className="secondary-button" onClick={load} disabled={loading}><Search size={18} /> Search</button>
      </div>

      <div className="qr-grid">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <article className="qr-card qr-card-skeleton" key={i}><span /><p /><dl><div /><div /><div /></dl></article>
        ))}
        {!loading && qrItems.map((qr) => (
          <article className="qr-card" key={qr._id}>
            <div>
              <strong>{qr.name}</strong>
              <span>{qr.token}</span>
            </div>
            <p>{qr.description || 'No description'}</p>
            <dl>
              <div><dt>Size</dt><dd>{formatBytes(qr.sizeBytes)}</dd></div>
              <div><dt>Status</dt><dd>{qr.status}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(qr.updatedAt)}</dd></div>
            </dl>
            <div className="button-row">
              <Link className="primary-button" to={`/qrcodes/${qr._id}`}>Manage</Link>
              <button className="icon-button" title="Download QR" onClick={() => downloadQrImage(qr)} disabled={busy === `dl-${qr._id}`}>
                {busy === `dl-${qr._id}` ? <span className="spinner small-spinner" /> : <Download size={18} />}
              </button>
              <button className="icon-button danger" title="Recycle" onClick={() => recycleQr(qr._id)}>
                <Trash size={18} />
              </button>
            </div>
          </article>
        ))}
        {!loading && !qrItems.length && (
          <div className="qr-empty">No QR codes in this collection yet.</div>
        )}
      </div>

      {/* Create QR Modal */}
      {modal === 'create' && (
        <Modal title="Create QR" onClose={() => setModal(null)}>
          <form onSubmit={createQr} className="modal-form">
            {error && <div className="error-box">{error}</div>}
            <div className="field"><label>QR Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Product Catalogue" /></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            {col?.defaultPdf && (
              <div className="col-pdf-indicator"><FileText size={13} /> Collection PDF <strong>{col.defaultPdf.originalName}</strong> will be auto-attached.</div>
            )}
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={busy === 'create'}>{busy === 'create' ? 'Creating...' : 'Create QR'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Create Modal */}
      {modal === 'bulk' && (
        <Modal title="Bulk Create from Folders" onClose={() => { setModal(null); setBulkFolders([]); setBulkResults(null); setBulkParentName(''); setBulkSkippedFiles(0); }}>
          <div className="bulk-modal">
            <p className="bulk-intro">Select one parent folder. Each child folder inside it becomes a QR code - the child folder name becomes the QR title, and all files inside that child folder are uploaded to that QR.</p>

            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory="true"
              multiple
              hidden
              onChange={onFolderInput}
            />

            {!bulkResults && (
              <>
                <button className="secondary-button bulk-pick-btn" onClick={() => folderInputRef.current?.click()}>
                  <FolderUp size={18} /> {bulkFolders.length ? `${bulkFolders.length} child folder(s) selected - Choose different parent` : 'Select Parent Folder'}
                </button>

                {bulkFolders.length > 0 && (
                  <div className="bulk-folder-list">
                    <div className="bulk-folder-header">
                      <strong>{bulkFolders.length} child folder(s) queued</strong>
                      <span>{bulkFolders.reduce((s, f) => s + f.files.length, 0)} files total</span>
                    </div>
                    {bulkParentName && (
                      <div className="bulk-parent-note">
                        Parent folder: <strong>{bulkParentName}</strong>
                        {bulkSkippedFiles > 0 && <span>{bulkSkippedFiles} direct parent file(s) skipped</span>}
                      </div>
                    )}
                    {bulkFolders.map((f) => (
                      <div className="bulk-folder-row" key={f.name}>
                        <div>
                          <strong>{f.name}</strong>
                          <span>{f.files.length} file(s)</span>
                        </div>
                        <button className="icon-button" onClick={() => removeBulkFolder(f.name)} title="Remove folder"><XCircle size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {bulkProgress && (
                  <div className="bulk-progress">
                    <Loader size={16} className="spin" />
                    <span>Creating {bulkProgress.current} / {bulkProgress.total}: {bulkProgress.name}</span>
                  </div>
                )}

                <div className="button-row">
                  <button className="secondary-button" onClick={() => { setModal(null); setBulkFolders([]); setBulkParentName(''); setBulkSkippedFiles(0); }}>Cancel</button>
                  <button
                    className="primary-button"
                    onClick={runBulkCreate}
                    disabled={!bulkFolders.length || busy === 'bulk'}
                  >
                    {busy === 'bulk' ? 'Creating...' : `Create ${bulkFolders.length} QR Code(s)`}
                  </button>
                </div>
              </>
            )}

            {bulkResults && (
              <div className="bulk-results">
                <div className="bulk-results-header">
                  <strong>{bulkResults.filter((r) => r.status === 'ok').length} created</strong>
                  {bulkResults.some((r) => r.status === 'error') && (
                    <span className="bulk-errors">{bulkResults.filter((r) => r.status === 'error').length} failed</span>
                  )}
                </div>
                <div className="bulk-result-list">
                  {bulkResults.map((r) => (
                    <div className={`bulk-result-row ${r.status}`} key={r.folder}>
                      {r.status === 'ok' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      <strong>{r.folder}</strong>
                      {r.status === 'error' && <span className="bulk-err-msg">{r.message}</span>}
                    </div>
                  ))}
                </div>
                <button className="primary-button" onClick={() => { setModal(null); setBulkResults(null); setBulkParentName(''); setBulkSkippedFiles(0); }}>Done</button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
