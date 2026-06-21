import { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { api } from '../api/http.js';
import './Settings.css';

export default function Settings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/auth/change-password', form);
      setForm({ currentPassword: '', newPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password.');
    }
  }

  async function submitPin(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/auth/change-recycle-pin', pinForm);
      setPinForm({ currentPin: '', newPin: '' });
      setMessage('Recycle bin PIN changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change PIN.');
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage administrator security settings.</p>
        </div>
      </div>
      <form className="settings-panel" onSubmit={submit}>
        <h2><KeyRound size={19} /> Change Password</h2>
        {error && <div className="error-box">{error}</div>}
        {message && <div className="success-box">{message}</div>}
        <div className="field"><label>Current Password</label><input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required /></div>
        <div className="field"><label>New Password</label><input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={8} /></div>
        <button className="primary-button"><Save size={18} /> Save Password</button>
      </form>
      <form className="settings-panel" onSubmit={submitPin}>
        <h2><KeyRound size={19} /> Recycle Bin PIN</h2>
        <div className="field"><label>Current PIN</label><input value={pinForm.currentPin} onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })} maxLength={4} inputMode="numeric" required /></div>
        <div className="field"><label>New PIN</label><input value={pinForm.newPin} onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })} maxLength={4} inputMode="numeric" required /></div>
        <button className="primary-button"><Save size={18} /> Save PIN</button>
      </form>
    </section>
  );
}
