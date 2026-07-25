import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FolderTree,
  Gauge,
  History,
  Layers,
  Lock,
  QrCode,
  Recycle,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { routes } from '../routes/paths.js';
import './Landing.css';

const appName = import.meta.env.VITE_APP_NAME || 'Dynamic QR';

const parts = [
  {
    index: '01',
    title: 'Collections',
    text: 'Group QR codes by product line, campaign, or client so every related file lives in one governed folder.',
    icon: FolderTree
  },
  {
    index: '02',
    title: 'Dynamic QR engine',
    text: 'Each printed code points to a link you can repoint at any time — swap files without reprinting a single label.',
    icon: QrCode
  },
  {
    index: '03',
    title: 'Secure vault viewer',
    text: 'Scans open a fast, mobile-first viewer for images, PDFs, video, and audio — no app or account required.',
    icon: ScanLine
  },
  {
    index: '04',
    title: 'Recovery & governance',
    text: 'Soft-delete, PIN-protected recycle bin, and activity history keep every change accountable and reversible.',
    icon: ShieldCheck
  }
];

const steps = [
  {
    index: '01',
    title: 'Create a collection',
    text: 'Start with a named collection and an optional shared PDF for the files inside it.'
  },
  {
    index: '02',
    title: 'Generate the QR',
    text: 'Design the code, attach files, and publish — the vault link goes live instantly.'
  },
  {
    index: '03',
    title: 'Print once, update forever',
    text: 'Swap the destination files any time. The printed code and its scans never need to change.'
  }
];

const useCases = [
  { title: 'Product packaging', text: 'Link a printed label to manuals, certifications, or care instructions that stay current after launch.' },
  { title: 'Property & real estate', text: 'One yard sign, one code — swap the listing PDF and photos as a property moves through its lifecycle.' },
  { title: 'Events & venues', text: 'Point attendees to the latest schedule, menu, or map without reprinting signage mid-event.' },
  { title: 'Internal operations', text: 'Attach equipment manuals or safety documents to asset tags and update them as procedures change.' }
];

const stats = [
  { value: 'Unlimited', label: 'Scans per QR code' },
  { value: 'Instant', label: 'Content swaps, no reprint' },
  { value: '2 themes', label: 'Linen & Dark workspace' },
  { value: '4 file types', label: 'Image, PDF, video, audio' }
];

export default function Landing() {
  return (
    <main className="landing-page">
      <div className="landing-glow" aria-hidden="true" />

      <header className="landing-topbar">
        <div className="landing-shell">
          <Link to={routes.landing} className="landing-brand">
            <span className="landing-brand-mark"><QrCode size={18} /></span>
            <span>{appName}</span>
          </Link>
          <nav className="landing-nav">
            <a href="#parts">Parts</a>
            <a href="#how-it-works">How it works</a>
            <a href="#use-cases">Use cases</a>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-shell landing-hero-grid">
          <div className="landing-copy">
            <p className="section-eyebrow"><Sparkles size={13} /> Dynamic QR management platform</p>
            <h1>One code, printed once. Content, updated forever.</h1>
            <p className="landing-summary">
              {appName} separates what a QR code <em>looks like</em> from what it <em>points to</em>. Manage
              collections, files, and access from a secure control room — visitors just scan and view.
            </p>
            <div className="landing-cta-row">
              <Link className="primary-button landing-cta-primary">
                Open admin workspace <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="secondary-button">
                See how it works
              </a>
            </div>
            <div className="landing-hero-trust">
              <span><Lock size={14} /> JWT-protected admin routes</span>
              <span><Recycle size={14} /> PIN-locked recycle bin</span>
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="hero-ticket">
              <div className="hero-qr">
                <span className="hero-qr-finder tl" />
                <span className="hero-qr-finder tr" />
                <span className="hero-qr-finder bl" />
                <span className="hero-qr-noise" />
              </div>
              <div className="hero-ticket-info">
                <span className="hero-ticket-row"><b>Collection</b> Product Catalogues</span>
                <span className="hero-ticket-row"><b>Files</b> 3 active</span>
                <span className="hero-ticket-row hero-ticket-status"><b>Status</b> <i /> Active</span>
              </div>
            </div>
            <div className="hero-float-card hero-float-scan">
              <ScanLine size={16} /> Scan opens the vault viewer
            </div>
            <div className="hero-float-card hero-float-swap">
              <Gauge size={16} /> Repoint the link anytime
            </div>
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div className="landing-shell landing-stats-grid">
          {stats.map((stat) => (
            <div className="landing-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="parts">
        <div className="landing-shell">
          <div className="landing-section-head">
            <p className="section-eyebrow"><Layers size={13} /> The four parts</p>
            <h2>Everything a QR operations team needs, built as four parts</h2>
            <p>Each part of the platform does one job well, and they hand off to each other cleanly.</p>
          </div>
          <div className="parts-grid">
            {parts.map(({ index, title, text, icon: Icon }) => (
              <article className="part-card" key={title}>
                <div className="part-card-top">
                  <span className="part-index">{index}</span>
                  <Icon size={20} />
                </div>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt" id="how-it-works">
        <div className="landing-shell">
          <div className="landing-section-head">
            <p className="section-eyebrow"><History size={13} /> Process</p>
            <h2>From blank collection to a working vault link in three steps</h2>
          </div>
          <div className="steps-row">
            {steps.map((step, i) => (
              <div className="step-card" key={step.title}>
                <div className="step-number">{step.index}</div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
                {i < steps.length - 1 && <span className="step-connector" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="use-cases">
        <div className="landing-shell">
          <div className="landing-section-head">
            <p className="section-eyebrow"><Smartphone size={13} /> Use cases</p>
            <h2>Wherever a printed code needs to outlive its content</h2>
          </div>
          <div className="usecase-grid">
            {useCases.map((item) => (
              <article className="usecase-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-shell landing-cta-band-inner">
          <div>
            <h2>Sign in to your control room</h2>
            <p>Manage collections, design QR codes, and review activity from one secure dashboard.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
          <div className="landing-brand landing-footer-brand">
            <span className="landing-brand-mark"><QrCode size={16} /></span>
            <span>{appName}</span>
          </div>
          <p>Dynamic QR codes, secure vaults, and collection-based file governance.</p>
          <p className="landing-footer-fine">&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
