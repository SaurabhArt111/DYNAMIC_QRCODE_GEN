import { Link } from 'react-router-dom';
import { ArrowLeft, Home, QrCode } from 'lucide-react';
import { routes } from '../routes/paths.js';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="not-found-page">
      {/* Signature gradient bar (inverted from landing) */}
      <div className="not-found-gradient-bar"></div>

      {/* Animated background elements */}
      <div className="not-found-bg">
        <div className="not-found-grid"></div>
        <div className="not-found-blur-accent"></div>
      </div>

      <section className="not-found-container">
        {/* Header with brand */}
        <header className="not-found-header">
          <Link to={routes.landing} className="not-found-brand">
            <QrCode size={20} strokeWidth={1.5} />
            <span>Back to home</span>
          </Link>
        </header>

        {/* Hero number */}
        <div className="not-found-hero">
          <span className="not-found-number">404</span>
        </div>

        {/* Content */}
        <div className="not-found-content">
          <h1>Lost in the void</h1>
          <p>
            The page you're looking for doesn't exist here. It might have been moved,
            deleted, or the path is incorrect.
          </p>

          {/* Actions */}
          <div className="not-found-actions">
            <Link className="not-found-btn not-found-btn--primary" to={routes.landing}>
              <Home size={18} strokeWidth={1.5} />
              <span>Go Home</span>
            </Link>
            <button
              className="not-found-btn not-found-btn--secondary"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Decorative divider */}
        <div className="not-found-divider"></div>
      </section>
    </main>
  );
}
