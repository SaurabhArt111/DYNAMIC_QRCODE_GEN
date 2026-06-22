import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Download, FolderUp, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../api/http.js';
import Modal from '../components/Modal.jsx';
import { formatBytes, formatDate } from '../utils/format.js';
import './QRCodes.css';
import './Collections.css';

const emptyCollectionForm = { name: '', description: '', defaultPdf: null };
const emptyQrForm = { name: '', description: '' };

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [active, setActive] = useState(null);
  const [modal, setModal] = useState(null);
  const [collectionForm, setCollectionForm] = useState(emptyCollectionForm);
  const [qrForm, setQrForm] = useState(emptyQrForm);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const folderInputRef = useRef(null);

  async function loadCollections() {
    const { data } = await api.get('/collections');
    setCollections(data.items);
    if (!active && data.items.length) {
      await loadCollection(data.items[0]._id);
    }
  }

  async function loadCollection(id) {
    const { data } = await api.get(`/collections/${id}`);
    setActive(data);
  }

  useEffect(() => {
    loadCollections();
  }, []);

  async function createCollection(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', collectionForm.name);
    formData.append('description', collectionForm.description);
    if (collectionForm.defaultPdf) formData.append('defaultPdf', collectionForm.defaultPdf);

    setBusyAction('create-collection');
    try {
      const { data } = await api.post('/collections', formData);
      setCollectionForm(emptyCollectionForm);
      setModal(null);
      setError('');
      await loadCollections();
      await loadCollection(data._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create collection.');
    } finally {
      setBusyAction('');
    }
  }

  async function saveCollection(event) {
    event.preventDefault();
    if (!active?.collection) return;

    const formData = new FormData();
    formData.append('name', active.collection.name);
    formData.append('description', active.collection.description || '');
    const file = event.currentTarget.defaultPdf.files?.[0];
    if (file) formData.append('defaultPdf', file);

    setBusyAction('save-collection');
    try {
      await api.put(`/collections/${active.collection._id}`, formData);
      await loadCollections();
      await loadCollection(active.collection._id);
      event.currentTarget.defaultPdf.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save collection.');
    } finally {
      setBusyAction('');
    }
  }

  async function removeDefaultPdf() {
    if (!active?.collection) return;
    setBusyAction('remove-pdf');
    try {
      await api.delete(`/collections/${active.collection._id}/default-pdf`);
      await loadCollection(active.collection._id);
      await loadCollections();
    } finally {
      setBusyAction('');
    }
  }

  async function deleteCollection() {
    if (!active?.collection) return;
    if (!window.confirm('Delete this empty collection?')) return;

    setBusyAction('delete-collection');
    try {
      await api.delete(`/collections/${active.collection._id}`);
      setActive(null);
      setError('');
      await loadCollections();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete collection.');
    } finally {
      setBusyAction('');
    }
  }

  async function createQr(event) {
    event.preventDefault();
    if (!active?.collection) return;

    setBusyAction('create-qr');
    try {
      await api.post(`/collections/${active.collection._id}/qrcodes`, qrForm);
      setQrForm(emptyQrForm);
      setModal(null);
      await loadCollection(active.collection._id);
      await loadCollections();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create QR.');
    } finally {
      setBusyAction('');
    }
  }

  async function bulkCreate(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !active?.collection) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.webkitRelativePath || file.name));
    setBusyAction('bulk-folders');
    try {
      const { data } = await api.post(`/collections/${active.collection._id}/bulk-folders`, formData);
      setModal(null);
      setError(`Created ${data.count} QR codes from folders.`);
      await loadCollection(active.collection._id);
      await loadCollections();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk folder creation failed.');
    } finally {
      setBusyAction('');
      event.target.value = '';
    }
  }

  return (
    <section className="page">
      <input ref={folderInputRef} hidden type="file" multiple webkitdirectory="" directory="" onChange={bulkCreate} />
      <div className="page-header">
        <div>
          <h1>Collections</h1>
          <p>Group QR codes and attach one shared PDF to every QR in the collection.</p>
        </div>
        <button className="primary-button" onClick={() => setModal('collection')}><Plus size={18} /> New Collection</button>
      </div>

      {error && <div className={error.startsWith('Created') ? 'success-box' : 'error-box'}>{error}</div>}

      <div className="collections-layout">
        <aside className="collections-list">
          {collections.map((collection) => (
            <button
              type="button"
              className={active?.collection?._id === collection._id ? 'collection-tab active' : 'collection-tab'}
              key={collection._id}
              onClick={() => loadCollection(collection._id)}
            >
              <Archive size={18} />
              <span>
                <strong>{collection.name}</strong>
                <small>{collection.qrCount} QR codes</small>
              </span>
            </button>
          ))}
          {!collections.length && <div className="qr-empty">No collections yet.</div>}
        </aside>

        {active?.collection ? (
          <div className="collection-workspace">
            <form className="detail-panel collection-editor" onSubmit={saveCollection}>
              <div className="collection-editor-grid">
                <div className="field">
                  <label>Collection Name</label>
                  <input value={active.collection.name} onChange={(e) => setActive({ ...active, collection: { ...active.collection, name: e.target.value } })} />
                </div>
                <div className="field">
                  <label>Shared PDF</label>
                  <input name="defaultPdf" type="file" accept="application/pdf" />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={active.collection.description || ''} onChange={(e) => setActive({ ...active, collection: { ...active.collection, description: e.target.value } })} />
              </div>
              <div className="collection-pdf-row">
                <span>
                  {active.collection.defaultFile
                    ? `${active.collection.defaultFile.originalName} - ${formatBytes(active.collection.defaultFile.sizeBytes)}`
                    : 'No shared PDF attached'}
                </span>
                <div className="button-row">
                  {active.collection.defaultFile && (
                    <button type="button" className="secondary-button" onClick={removeDefaultPdf} disabled={busyAction === 'remove-pdf'}><Trash2 size={18} /> Remove PDF</button>
                  )}
                  <button type="button" className="danger-button" onClick={deleteCollection} disabled={active.collection.qrCount > 0 || busyAction === 'delete-collection'}><Trash2 size={18} /> Delete</button>
                  <button className="primary-button" disabled={busyAction === 'save-collection'}><Save size={18} /> {busyAction === 'save-collection' ? 'Saving...' : 'Save Collection'}</button>
                </div>
              </div>
            </form>

            <div className="page-header compact-header">
              <div>
                <h2>QR Codes</h2>
                <p>{active.qrs.length} QR codes in this collection.</p>
              </div>
              <div className="button-row">
                <button className="secondary-button" onClick={() => setModal('bulk')} disabled={busyAction === 'bulk-folders'}><FolderUp size={18} /> Bulk Create</button>
                <button className="primary-button" onClick={() => setModal('qr')}><Plus size={18} /> Create QR</button>
              </div>
            </div>

            <div className="qr-grid">
              {active.qrs.map((qr) => (
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
                  </div>
                </article>
              ))}
              {!active.qrs.length && <div className="qr-empty">No QR codes in this collection.</div>}
            </div>
          </div>
        ) : (
          <div className="qr-empty">Create a collection to begin.</div>
        )}
      </div>

      {modal === 'collection' && (
        <Modal title="New Collection" onClose={() => setModal(null)}>
          <form onSubmit={createCollection}>
            <div className="field"><label>Name</label><input value={collectionForm.name} onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })} required /></div>
            <div className="field"><label>Description</label><textarea value={collectionForm.description} onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })} /></div>
            <div className="field"><label>Default PDF</label><input type="file" accept="application/pdf" onChange={(e) => setCollectionForm({ ...collectionForm, defaultPdf: e.target.files?.[0] || null })} /></div>
            <button className="primary-button" disabled={busyAction === 'create-collection'}><UploadCloud size={18} /> {busyAction === 'create-collection' ? 'Creating...' : 'Create Collection'}</button>
          </form>
        </Modal>
      )}

      {modal === 'qr' && (
        <Modal title="Create QR" onClose={() => setModal(null)}>
          <form onSubmit={createQr}>
            <div className="field"><label>QR Name</label><input value={qrForm.name} onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })} required /></div>
            <div className="field"><label>Description</label><textarea value={qrForm.description} onChange={(e) => setQrForm({ ...qrForm, description: e.target.value })} /></div>
            <button className="primary-button" disabled={busyAction === 'create-qr'}><Plus size={18} /> {busyAction === 'create-qr' ? 'Creating...' : 'Create QR'}</button>
          </form>
        </Modal>
      )}

      {modal === 'bulk' && (
        <Modal title="Bulk Create From Folders" onClose={() => setModal(null)}>
          <div className="bulk-guide">
            <p>Select one or more folders. Each top-level folder becomes one QR code, and files inside it are attached to that QR.</p>
            <div className="bulk-notes">
              <span>Folder name becomes QR name</span>
              <span>Supports large multi-folder batches</span>
              <span>Shared collection PDF is linked automatically</span>
            </div>
            <button className="primary-button" onClick={() => folderInputRef.current?.click()} disabled={busyAction === 'bulk-folders'}>
              <FolderUp size={18} /> {busyAction === 'bulk-folders' ? 'Uploading...' : 'Choose Folders'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
