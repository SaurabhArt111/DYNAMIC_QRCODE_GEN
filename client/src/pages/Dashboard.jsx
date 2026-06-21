import { useEffect, useState } from 'react';
import { Activity, Database, QrCode, ScanLine, TrendingUp } from 'lucide-react';
import { api } from '../api/http.js';
import { formatBytes, formatDate } from '../utils/format.js';
import './Dashboard.css';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data));
  }, []);

  const cards = [
    ['Total QR Codes', data?.totalQrCodes || 0, QrCode],
    ['Active QR Codes', data?.activeQrCodes || 0, TrendingUp],
    ['Total Scans', data?.totalScans || 0, ScanLine],
    ["Today's Scans", data?.todayScans || 0, Activity],
    ['Storage Usage', formatBytes(data?.storageUsageBytes || 0), Database]
  ];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Operational overview for every dynamic QR in the vault.</p>
        </div>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="metric-card" key={label}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="activity-panel">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {(data?.recentActivity || []).map((item) => (
            <div className="activity-item" key={item._id}>
              <strong>{item.message}</strong>
              <span>{formatDate(item.createdAt)}</span>
            </div>
          ))}
          {data?.recentActivity?.length === 0 && <p>No activity yet.</p>}
        </div>
      </section>
    </section>
  );
}
