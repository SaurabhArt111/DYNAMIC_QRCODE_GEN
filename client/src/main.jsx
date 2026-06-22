import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Collections from './pages/Collections.jsx';
import QRCodes from './pages/QRCodes.jsx';
import QRDetail from './pages/QRDetail.jsx';
import RecycleBin from './pages/RecycleBin.jsx';
import Settings from './pages/Settings.jsx';
import Viewer from './pages/Viewer.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import './styles/global.css';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/vault/:token" element={<Viewer />} />
          <Route path="/vault" element={<Navigate to="/login" replace />} />
          <Route path="/vault/*" element={<Navigate to="/login" replace />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <App />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="collections" element={<Collections />} />
            <Route path="qrcodes" element={<QRCodes />} />
            <Route path="qrcodes/:id" element={<QRDetail />} />
            <Route path="recycle-bin" element={<RecycleBin />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
