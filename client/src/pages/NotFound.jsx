import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { routes } from '../routes/paths.js';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="not-found-page">
      {/* Animated background elements */}
      <div className="not-found-bg">
        <div className="blur-orb blur-orb--1"></div>
        <div className="blur-orb blur-orb--2"></div>
      </div>

      <section className="not-found-container">
        {/* 404 number with glitch effect */}
        <div className="not-found-hero">
          <span className="not-found-number">404</span>
        </div>

        {/* Content section */}
        <div className="not-found-content">
          <h1>Lost in the void</h1>
          <p>
            The page you're looking for wandered off. It might've been moved, 
            deleted, or it never existed in the first place.
          </p>

          {/* Action buttons */}
          <div className="not-found-actions">
            <Link className="btn btn--primary" to={routes.landing}>
              <Home size={18} />
              <span>Go Home</span>
            </Link>
            <button className="btn btn--secondary" onClick={() => window.history.back()}>
              <ArrowLeft size={18} />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Decorative bottom accent */}
        <div className="not-found-footer">
          <div className="accent-line"></div>
        </div>
      </section>
    </main>
  );
}
