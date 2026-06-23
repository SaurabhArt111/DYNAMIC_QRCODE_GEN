import { useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../api/http.js';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/format.js';
import './RecycleBin.css';

export default function RecycleBin() {
  const [items, setItems] = useState([]);
  const [pin, setPin] = useState('');
  const [verified, setVerified] = useState(false);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/recycle-bin');
    setItems(data.items);
  }

  useEffect(() => {
    if (verified) load();
  }, [verified]);

  async function verify(event) {
    event.preventDefault();
    try {
      await api.post('/auth/verify-recycle-pin', { pin });
      setVerified(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid PIN.');
    }
  }

  async function restore(id) {
    await api.post(`/recycle-bin/${id}/restore`, { pin });
    load();
  }

  async function purge() {
    await api.delete(`/recycle-bin/${target}`, { data: { pin } });
    setTarget(null);
    load();
  }

  function itemLabel(entry) {
    if (entry.itemType === 'collection') return 'Collection';
    if (entry.itemType === 'upload') return 'File';
    return 'QR code';
  }

  function itemName(entry) {
    return entry.qrCode?.name || entry.collection?.name || entry.upload?.originalName || entry.snapshot?.name || entry.snapshot?.originalName;
  }

  if (!verified) {
    return (
      <section className="pin-page">
        <form className="pin-panel" onSubmit={verify}>
          <h1>Recycle Bin PIN</h1>
          <p>Enter the 4 digit PIN to manage deleted QR codes, collections, and files.</p>
          {error && <div className="error-box">{error}</div>}
          <div className="field"><label>PIN</label><input value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} inputMode="numeric" /></div>
          <button className="primary-button">Enter</button>
        </form>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Recycle Bin</h1>
          <p>Restore QR codes, collections, and files, or permanently delete them after confirmation.</p>
        </div>
      </div>
      <div className="recycle-list">
        {items.map((entry) => (
          <article className="recycle-row" key={entry._id}>
            <div>
              <strong>{itemName(entry)}</strong>
              <span>{itemLabel(entry)} - Deleted {formatDate(entry.deletedAt)}</span>
            </div>
            <div className="button-row">
              <button className="secondary-button" onClick={() => restore(entry._id)}><RotateCcw size={18} /> Restore</button>
              <button className="danger-button" onClick={() => setTarget(entry._id)}><Trash2 size={18} /> Delete</button>
            </div>
          </article>
        ))}
        {!items.length && <p>No deleted items.</p>}
      </div>
      {target && (
        <Modal title="Permanently Delete Item" onClose={() => setTarget(null)}>
          <p>This cannot be undone. Related uploaded files or collection PDF files will also be removed.</p>
          <button className="danger-button" onClick={purge}>Confirm Permanent Delete</button>
        </Modal>
      )}
    </section>
  );
}
