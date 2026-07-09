import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import App from './App.jsx';
import Login from './pages/Login.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Collections from './pages/Collections.jsx';
import CollectionDetail from './pages/CollectionDetail.jsx';
import QRCodes from './pages/QRCodes.jsx';
import QRDetail from './pages/QRDetail.jsx';
import RecycleBin from './pages/RecycleBin.jsx';
import Settings from './pages/Settings.jsx';
import Viewer from './pages/Viewer.jsx';
import NotFound from './pages/NotFound.jsx';
import { routes } from './routes/paths.js';

import './styles/global.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={routes.dashboard} replace />;
  }
  return children;
}

const router = createBrowserRouter(
  [
    {
      path: routes.landing,
      element: <Landing />
    },
    {
      path: routes.login,
      element: (
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      )
    },
    {
      path: routes.viewer(),
      element: <Viewer />
    },
    {
      path: routes.adminRoot,
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
    },
    {
      path: '*',
      element: <NotFound />
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
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
