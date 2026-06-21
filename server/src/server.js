import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureUploadRoot } from './utils/storage.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import recycleRoutes from './routes/recycleRoutes.js';
import viewerRoutes from './routes/viewerRoutes.js';
import { errorHandler, notFound } from './middleware/notFound.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 700,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (req, res) => {
  res.json({ ok: true, appName: env.appName });
});

app.get('/vault/:token', (req, res) => {
  res.redirect(302, `${env.clientUrl}/vault/${req.params.token}`);
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/qrcodes', qrRoutes);
app.use('/api/recycle-bin', recycleRoutes);
app.use('/api/vault', viewerRoutes);

app.use(notFound);
app.use(errorHandler);

await ensureUploadRoot();
await connectDb();

app.listen(env.port, () => {
  console.log(`${env.appName} API running on port ${env.port}`);
});
