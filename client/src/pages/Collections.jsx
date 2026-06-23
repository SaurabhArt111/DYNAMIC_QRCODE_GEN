import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Trash2, Edit2, FileText } from 'lucide-react';
import { api } from '../api/http.js';
import Modal from '../components/Modal.jsx';
import { formatBytes, formatDate } from '../utils/format.js';
import './Collections.css';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | { edit: col }
  const [form, setForm] = useState({ name: '', description: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pdfInputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/collections');
      setCollections(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ name: '', description: '' });
    setPdfFile(null);
    setRemovePdf(false);
    setError('');
    setModal('create');
  }

  function openEdit(col) {
    setForm({ name: col.name, description: col.description || '' });
    setPdfFile(null);
    setRemovePdf(false);
    setError('');
    setModal({ edit: col });
  }

  async function submitForm() {
    if (!form.name.trim()) { setError('Collection name is required.'); return; }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('description', form.description);
      if (pdfFile) fd.append('defaultPdf', pdfFile);
      if (modal?.edit && removePdf) fd.append('removePdf', 'true');

      if (modal?.edit) {
        await api.put(`/collections/${modal.edit._id}`, fd);
      } else {
        await api.post('/collections', fd);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCollection(col) {
    if (!window.confirm(`Delete collection "${col.name}"? QR codes inside will be unlinked (not deleted).`)) return;
    try {
      await api.delete(`/collections/${col._id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  async function downloadCollectionZip(col) {
    setBusy('zip');
    setError('');
    try {
      const res = await api.get(`/collections/${col._id}/qr-images.zip`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${col?.name || 'collection'}-qr-images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download QR images.');
    } finally {
      setBusy('');
    }
  }

  const editingCol = modal?.edit;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Collections</h1>
          <p>Organise QR codes into groups with a shared default PDF document.</p>
        </div>
        <button className="primary-button" onClick={openCreate}><Plus size={18} /> New Collection</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="col-grid">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <article className="col-card col-card-skeleton" key={i}><span /><p /><div /></article>
        ))}
        {!loading && collections.map((col) => (
          <article className="col-card" key={col._id}>
            <div className="col-card-header">
              <FolderOpen size={22} className="col-icon" />
              <strong>{col.name}</strong>
            </div>
            {col.description && <p className="col-desc">{col.description}</p>}
            {col.defaultPdf ? (
              <div className="col-pdf-badge">
                <FileText size={14} />
                <span>{col.defaultPdf.originalName}</span>
                <span className="col-pdf-size">{formatBytes(col.defaultPdf.sizeBytes)}</span>
              </div>
            ) : (
              <div className="col-pdf-badge col-pdf-none">No default PDF</div>
            )}
            <div className="col-meta">{formatDate(col.createdAt)}</div>
            <div className="button-row">
              <Link className="primary-button" to={`/collections/${col._id}`}>Open</Link>
              <button className="icon-button" title="Edit" onClick={() => openEdit(col)}><Edit2 size={16} /></button>
              <button className="icon-button danger" title="Delete" onClick={() => deleteCollection(col)}><Trash2 size={16} /></button>
              <button
                className="icon-button"
                title="Download QR Images"
                onClick={() => downloadCollectionZip(col)}
                disabled={busy === 'zip'}
              >
                {busy === 'zip' ? <span className="spinner small-spinner" /> : <Download size={18} />}
                <span>ZIP</span>
              </button>
            </div>
          </article>
        ))}
        {!loading && !collections.length && (
          <div className="col-empty">No collections yet. Create one to group your QR codes.</div>
        )}
      </div>

      {(modal === 'create' || modal?.edit) && (
        <Modal title={editingCol ? `Edit "${editingCol.name}"` : 'New Collection'} onClose={() => setModal(null)}>
          <div className="modal-form">
            {error && <div className="error-box">{error}</div>}
            <div className="field">
              <label>Collection Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Product Catalogues" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description" />
            </div>
            <div className="field">
              <label>Default PDF (optional)</label>
              <p className="field-hint">This PDF will appear in every QR code inside this collection.</p>
              {editingCol?.defaultPdf && !removePdf && !pdfFile && (
                <div className="existing-pdf">
                  <FileText size={14} />
                  <span>{editingCol.defaultPdf.originalName}</span>
                  <button type="button" className="remove-btn-sm" onClick={() => setRemovePdf(true)}>Remove</button>
                </div>
              )}
              {!removePdf && (
                <div className="pdf-pick-row">
                  <input ref={pdfInputRef} type="file" accept="application/pdf" hidden onChange={(e) => { setPdfFile(e.target.files[0] || null); e.target.value = ''; }} />
                  <button type="button" className="secondary-button" onClick={() => pdfInputRef.current?.click()}>
                    {pdfFile ? `${pdfFile.name} (${formatBytes(pdfFile.size)})` : (editingCol?.defaultPdf ? 'Replace PDF' : 'Choose PDF')}
                  </button>
                  {pdfFile && <button type="button" className="remove-btn-sm" onClick={() => setPdfFile(null)}>Clear</button>}
                </div>
              )}
              {removePdf && <p className="field-hint" style={{ color: 'var(--danger)' }}>PDF will be removed on save. <button type="button" className="link-btn" onClick={() => setRemovePdf(false)}>Undo</button></p>}
            </div>
            <div className="button-row">
              <button className="secondary-button" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button className="primary-button" onClick={submitForm} disabled={busy}>{busy ? 'Saving...' : (editingCol ? 'Save Changes' : 'Create Collection')}</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
