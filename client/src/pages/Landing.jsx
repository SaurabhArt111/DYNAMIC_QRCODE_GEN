import { Link } from 'react-router-dom';
import { ArrowRight, FolderTree, Lock, QrCode, ShieldCheck } from 'lucide-react';
import { routes } from '../routes/paths.js';
import './Landing.css';

const appName = import.meta.env.VITE_APP_NAME || 'DynamicVault QR';

const features = [
  {
    title: 'Collection-driven QR operations',
    text: 'Organize product lines, campaigns, and document sets with structured collections and bulk workflows.',
    icon: FolderTree
  },
  {
    title: 'Secure controlled access',
    text: 'Administrative tools stay behind authenticated routes while every QR stays shareable through its public vault link.',
    icon: Lock
  },
  {
    title: 'Production-focused governance',
    text: 'Recycle controls, storage oversight, and audit-friendly activity help teams run the system with confidence.',
    icon: ShieldCheck
  }
];

export default function Landing() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <header className="landing-topbar">
          <div className="landing-brand">
            <QrCode size={24} />
            <span>{appName}</span>
          </div>
          <nav className="landing-nav">
            <Link className="landing-nav-link" to={routes.dashboard}>
              Open Control Center
              <ArrowRight size={18} />
            </Link>
          </nav>
        </header>

        <div className="landing-copy">
          <p className="landing-kicker">Dynamic QR management platform</p>
          <h1>{appName}</h1>
          <p className="landing-summary">
            A clean public front door for visitors, with the full QR operations workspace tucked behind a secure admin control path.
          </p>
        </div>

        <div className="landing-overview">
          {features.map(({ title, text, icon: Icon }, index) => (
            <article 
              className="landing-feature" 
              key={title}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="landing-feature-icon">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
