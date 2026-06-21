import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, ExternalLink, Save, Trash2, UploadCloud } from 'lucide-react';
import { api, fileUrl } from '../api/http.js';
import Modal from '../components/Modal.jsx';
import { formatBytes, formatDate } from '../utils/format.js';
import './QRDetail.css';

export default function QRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [modalError, setModalError] = useState(null);

  async function load() {
    const res = await api.get(`/qrcodes/${id}`);
    setData(res.data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveQr(event) {
    event.preventDefault();
    const { qr } = data;
    await api.put(`/qrcodes/${id}`, { name: qr.name, description: qr.description, status: qr.status });
    load();
  }

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    try {
      await api.post(`/qrcodes/${id}/files`, formData);
      load();
    } catch (err) {
      const body = err.response?.data;
      setModalError([body?.message, ...(body?.details || [])].filter(Boolean));
    } finally {
      event.target.value = '';
    }
  }

  async function replaceFile(uploadId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.put(`/qrcodes/${id}/files/${uploadId}/replace`, formData);
      load();
    } catch (err) {
      const body = err.response?.data;
      setModalError([body?.message, ...(body?.details || [])].filter(Boolean));
    } finally {
      event.target.value = '';
    }
  }

  async function removeFile(uploadId) {
    await api.delete(`/qrcodes/${id}/files/${uploadId}`);
    load();
  }

  async function recycle() {
    await api.post(`/qrcodes/${id}/recycle`);
    navigate('/qrcodes');
  }

  async function downloadQr() {
    const res = await api.get(`/qrcodes/${id}/qr-image`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.qr.name}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <section className="page">Loading...</section>;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>{data.qr.name}</h1>
          <p>{data.qr.token}</p>
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={() => navigator.clipboard.writeText(data.qr.vaultUrl)}><Copy size={18} /> Copy URL</button>
          <a className="secondary-button" href={data.qr.vaultUrl.replace(import.meta.env.VITE_PUBLIC_BASE_URL || 'http://localhost:5000', '')} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Open</a>
          <button className="primary-button" onClick={downloadQr}><Download size={18} /> QR PNG</button>
          <button className="danger-button" onClick={recycle}><Trash2 size={18} /> Recycle</button>
        </div>
      </div>
      <div className="detail-layout">
        <form className="detail-panel" onSubmit={saveQr}>
          <h2>Content Details</h2>
          <div className="field"><label>QR Name</label><input value={data.qr.name} onChange={(e) => setData({ ...data, qr: { ...data.qr, name: e.target.value } })} /></div>
          <div className="field"><label>Description</label><textarea value={data.qr.description} onChange={(e) => setData({ ...data, qr: { ...data.qr, description: e.target.value } })} /></div>
          <div className="field"><label>Status</label><select value={data.qr.status} onChange={(e) => setData({ ...data, qr: { ...data.qr, status: e.target.value } })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <button className="primary-button"><Save size={18} /> Save Changes</button>
        </form>
        <aside className="detail-panel">
          <h2>QR Metadata</h2>
          <dl className="meta-list">
            <div><dt>Created</dt><dd>{formatDate(data.qr.createdAt)}</dd></div>
            <div><dt>Updated</dt><dd>{formatDate(data.qr.updatedAt)}</dd></div>
            <div><dt>Total Size</dt><dd>{formatBytes(data.qr.sizeBytes)}</dd></div>
            <div><dt>Scans</dt><dd>{data.qr.scanCount}</dd></div>
          </dl>
        </aside>
      </div>
      <section className="detail-panel">
        <div className="files-head">
          <h2>Uploaded Files</h2>
          <label className="primary-button"><UploadCloud size={18} /> Add Files<input hidden type="file" multiple onChange={uploadFiles} /></label>
        </div>
        <div className="file-list">
          {data.uploads.map((file) => (
            <article className="file-row" key={file._id}>
              <div>
                <strong>{file.originalName}</strong>
                <span>{file.category} · {formatBytes(file.sizeBytes)}</span>
              </div>
              <div className="button-row">
                <a className="secondary-button" href={fileUrl(`/api/vault/${data.qr.token}/files/${file._id}/download`)}>Download</a>
                <label className="secondary-button">Replace<input hidden type="file" onChange={(event) => replaceFile(file._id, event)} /></label>
                <button className="icon-button" onClick={() => removeFile(file._id)} aria-label="Remove file"><Trash2 size={18} /></button>
              </div>
            </article>
          ))}
          {!data.uploads.length && <p>No files uploaded yet.</p>}
        </div>
      </section>
      {modalError && (
        <Modal title="File Upload Rejected" onClose={() => setModalError(null)}>
          {modalError.map((line) => <p key={line}>{line}</p>)}
          <button className="primary-button" onClick={() => setModalError(null)}>OK</button>
        </Modal>
      )}
    </section>
  );
}
