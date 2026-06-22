import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, Plus, Search, Trash } from 'lucide-react';
import { api } from '../api/http.js';
import Modal from '../components/Modal.jsx';
import { formatBytes, formatDate } from '../utils/format.js';
import './QRCodes.css';

export default function QRCodes() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState({ search: '', filter: 'new' });
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const bulkInputRef = useRef(null);

  async function recycleQr(qrId) {
    try {
      await api.delete(`/qrcodes/${qrId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to recycle QR.');
    }
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/qrcodes', { params: query });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query.filter]);

  async function createQr(event) {
    event.preventDefault();
    setBusyAction('create');
    try {
      await api.post('/qrcodes', form);
      setForm({ name: '', description: '' });
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create QR.');
    } finally {
      setBusyAction('');
    }
  }

  async function bulkUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setBusyAction('bulk');
    try {
      await api.post('/qrcodes/bulk', formData);
      setModal(null);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk generation failed.');
    } finally {
      setBusyAction('');
      event.target.value = '';
    }
  }

  function openBulkPicker() {
    setModal(null);
    window.setTimeout(() => bulkInputRef.current?.click(), 0);
  }

  function downloadBulkTemplate() {
    const worksheet = `
      <table>
        <tr><th>QR Name</th><th>Description</th></tr>
        <tr><td>Product Catalogue</td><td>Catalogue QR for showroom display</td></tr>
        <tr><td>Warranty Card</td><td>Warranty PDF and support content</td></tr>
      </table>
    `;
    const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dynamicvault-bulk-qr-template.xls';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadQr(qr) {
    setBusyAction(`download-${qr._id}`);
    try {
      const res = await api.get(`/qrcodes/${qr._id}/qr-image`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${qr.name}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusyAction('');
    }
  }

  return (
    <section className="page">
      <input ref={bulkInputRef} hidden type="file" accept=".xlsx,.xls" onChange={bulkUpload} />
      <div className="page-header">
        <div>
          <h1>QR Codes</h1>
          <p>Create, filter, edit, and download secure dynamic QR codes.</p>
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={() => setModal('bulk')}>
            <FileSpreadsheet size={18} /> Bulk Excel
          </button>
          <button className="primary-button" onClick={() => setModal('create')}><Plus size={18} /> Create QR</button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="qr-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by QR name or ID"
            value={query.search}
            onChange={(e) => setQuery({ ...query, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <select value={query.filter} onChange={(e) => setQuery({ ...query, filter: e.target.value })}>
          <option value="active">Active</option>
          <option value="new">New First</option>
          <option value="old">Old First</option>
          <option value="az">From A to Z</option>
          <option value="za">From Z to A</option>
          <option value="edited">Last Edit</option>
        </select>
        <button className="secondary-button" onClick={load} disabled={loading}><Search size={18} /> {loading ? 'Searching...' : 'Search'}</button>
      </div>
      <div className="qr-grid">
        {loading && Array.from({ length: 6 }).map((_, index) => (
          <article className="qr-card qr-card-skeleton" key={index}>
            <span />
            <p />
            <dl>
              <div />
              <div />
              <div />
            </dl>
          </article>
        ))}
        {!loading && items.map((qr) => (
          <article className="qr-card" key={qr._id}>
            <div>
              <strong>{qr.name}</strong>
              <span>{qr.token}</span>
            </div>
            <p>{qr.description || 'No description'}</p>
            <dl>
              <div><dt>Size</dt><dd>{formatBytes(qr.sizeBytes)}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(qr.updatedAt)}</dd></div>
              <div><dt>Collection</dt><dd>{qr.collection?.name || 'None'}</dd></div>
            </dl>
            <div className="button-row">
              <Link className="primary-button" to={`/qrcodes/${qr._id}`}>Manage</Link>
              <button className="icon-button" title="Download QR" onClick={() => downloadQr(qr)} disabled={busyAction === `download-${qr._id}`}>
                {busyAction === `download-${qr._id}` ? <span className="spinner small-spinner" /> : <Download size={18} />}
              </button>
              <button className="icon-button" title="Recycle QR" onClick={() => {
                if (window.confirm('Are you sure you want to recycle this QR?')) {
                  recycleQr(qr._id);
                }
                }}><Trash size={18} style={{ color: 'red'}}/>
              </button>
            </div>
          </article>
        ))}
        {!loading && !items.length && <div className="qr-empty">No QR codes found.</div>}
      </div>
      {modal === 'create' && (
        <Modal title="Create QR" onClose={() => setModal(null)}>
          <form onSubmit={createQr}>
            <div className="field"><label>QR Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <button className="primary-button" disabled={busyAction === 'create'}>{busyAction === 'create' ? 'Creating...' : 'Create'}</button>
          </form>
        </Modal>
      )}
      {modal === 'bulk' && (
        <Modal title="Bulk Excel Format" onClose={() => setModal(null)}>
          <div className="bulk-guide">
            <p>Your Excel file must contain these exact column headers in the first row.</p>
            <table>
              <thead><tr><th>QR Name</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td>Product Catalogue</td><td>Catalogue QR for showroom display</td></tr>
                <tr><td>Warranty Card</td><td>Warranty PDF and support content</td></tr>
              </tbody>
            </table>
            <div className="bulk-notes">
              <span>Required: QR Name</span>
              <span>Optional: Description</span>
            </div>
            <div className="button-row">
              <button className="secondary-button" onClick={downloadBulkTemplate}><Download size={18} /> Template</button>
              <button className="primary-button" onClick={openBulkPicker} disabled={busyAction === 'bulk'}>
                <FileSpreadsheet size={18} /> {busyAction === 'bulk' ? 'Uploading...' : 'Proceed To Upload'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
