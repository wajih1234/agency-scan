import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './modules/auth/auth.routes.js';
import siteRoutes from './modules/sites/sites.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);

app.use(errorHandler);