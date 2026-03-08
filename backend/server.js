import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureAdminUser } from './services/bootstrapService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,tauri://localhost,http://tauri.localhost')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    // Desktop/web contexts can have different origins; allow only configured values.
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(mongoSanitize());
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);

app.use(errorHandler);

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required in environment variables');
  }

  await mongoose.connect(process.env.MONGO_URI);
  await ensureAdminUser();
  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
