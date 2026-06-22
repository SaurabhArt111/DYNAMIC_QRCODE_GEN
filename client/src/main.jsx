import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';

import App from './App.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Collections from './pages/Collections.jsx';
import CollectionDetail from './pages/CollectionDetail.jsx';
import QRCodes from './pages/QRCodes.jsx';
import QRDetail from './pages/QRDetail.jsx';
import RecycleBin from './pages/RecycleBin.jsx';
import Settings from './pages/Settings.jsx';
import Viewer from './pages/Viewer.jsx';

import './styles/global.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('dv_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <Login />
    },

    {
      path: '/vault/:token',
      element: <Viewer />
    },

    {
      path: '/',
      element: (
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'collections', element: <Collections /> },
        { path: 'collections/:id', element: <CollectionDetail /> },
        { path: 'qrcodes', element: <QRCodes /> },
        { path: 'qrcodes/:id', element: <QRDetail /> },
        { path: 'recycle-bin', element: <RecycleBin /> },
        { path: 'settings', element: <Settings /> }
      ]
    }
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_startTransition: true
    }
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);