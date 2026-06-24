import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { routes } from '../routes/paths.js';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-hero">
        <div className="not-found-content">
          {/* Large 404 number */}
          <div className="not-found-number-group">
            <span className="not-found-number">404</span>
          </div>

          {/* Headline and description */}
          <div className="not-found-text">
            <h1>Page not found</h1>
            <p>
              This page has wandered off—it may have been moved, archived, or never existed. 
              Let's get you back on track.
            </p>
          </div>

          {/* Action buttons */}
          <div className="not-found-actions">
            <Link className="not-found-btn not-found-btn--primary" to={routes.landing}>
              <Home size={18} />
              <span>Return to Home</span>
            </Link>
          </div>
        </div>

        {/* Decorative accent */}
        <div className="not-found-accent"></div>
      </section>
    </main>
  );
}
