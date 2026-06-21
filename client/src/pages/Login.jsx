import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, QrCode } from 'lucide-react';
import { api } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

const appName = import.meta.env.VITE_APP_NAME || 'DynamicVault QR';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-brand"><QrCode size={34} /> <span>{appName}</span></div>
        <h1>Admin Login</h1>
        <p>Secure access for the organization administrator.</p>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button className="primary-button" disabled={loading}><LogIn size={18} /> {loading ? 'Signing in...' : 'Login'}</button>
        <div className="login-lock"><Lock size={15} /> JWT protected session</div>
      </form>
    </main>
  );
}
