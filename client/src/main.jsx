import { lazy, StrictMode, Suspense } from 'react';
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
import { routes } from './routes/paths.js';

import './styles/global.css';

// Every route below is its own JS chunk, downloaded only when visited. This
// matters most for the public Viewer route (what a QR scan actually opens,
// often on a phone on cellular data) — it no longer pulls in the rest of
// the admin dashboard (the Design QR Code studio, ZIP/PDF export, etc.)
// just to show someone their files.
const Login = lazy(() => import('./pages/Login.jsx'));
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Collections = lazy(() => import('./pages/Collections.jsx'));
const CollectionDetail = lazy(() => import('./pages/CollectionDetail.jsx'));
const QRCodes = lazy(() => import('./pages/QRCodes.jsx'));
const QRDetail = lazy(() => import('./pages/QRDetail.jsx'));
const RecycleBin = lazy(() => import('./pages/RecycleBin.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Viewer = lazy(() => import('./pages/Viewer.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function RouteLoading() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <span className="spinner" />
    </div>
  );
}

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
            <Suspense fallback={<RouteLoading />}>
              <RouterProvider router={router} />
            </Suspense>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
