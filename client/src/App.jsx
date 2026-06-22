import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Archive, BarChart3, LogOut, QrCode, Recycle, Settings } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import './App.css';

const appName = import.meta.env.VITE_APP_NAME || 'DynamicVault QR';

export default function App() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <QrCode size={30} />
          <span>{appName}</span>
        </div>
        
        <nav className="nav-links desktop-nav">
          <NavLink to="/">
            <BarChart3 size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/qrcodes">
            <QrCode size={18} />
            <span>QR Codes</span>
          </NavLink>

          <NavLink to="/collections">
            <Archive size={18} />
            <span>Collections</span>
          </NavLink>

          <NavLink to="/recycle-bin">
            <Recycle size={18} />
            <span>Recycle Bin</span>
          </NavLink>

          <NavLink to="/settings">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>
        <button className="logout-button" onClick={handleLogout}><LogOut size={18} /> Logout</button>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <NavLink to="/">
          <BarChart3 size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/qrcodes">
          <QrCode size={20} />
          <span>QR</span>
        </NavLink>

        <NavLink to="/collections">
          <Archive size={20} />
          <span>Boxes</span>
        </NavLink>

        <NavLink to="/recycle-bin">
          <Recycle size={20} />
          <span>Bin</span>
        </NavLink>

        <NavLink to="/settings">
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </div>
    </div>
  );
}
