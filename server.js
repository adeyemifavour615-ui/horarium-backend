import 'dotenv/config';
import dns from 'dns';
import path from 'path';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRouter from './router/Auth.router.js';
import timeRouter from './router/Timeentry.router.js';
import adminRouter from './router/Admin.router.js';
import inviteRouter from './router/Invite.router.js';
import projectRouter from './router/Project.router.js';
import accountRouter from './router/Account.router.js';
import notificationRouter from './router/Notification.router.js';
import scheduleRouter from './router/Schedule.router.js';

// Fixes "querySrv ECONNREFUSED" on Windows, where IPv6-first DNS
// resolution often breaks the mongodb+srv:// SRV record lookup
dns.setDefaultResultOrder('ipv4first');

const app = express();

// CLIENT_URL can be a single origin or a comma-separated list (e.g. a
// deployed frontend + a Vercel preview URL). Falls back to the local
// Vite dev server so nothing changes for local development.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Serves uploaded profile pictures — a saved file at
// uploads/avatars/xyz.jpg becomes reachable at /uploads/avatars/xyz.jpg
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Horarium API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/time', timeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/invite', inviteRouter);
app.use('/api/projects', projectRouter);
app.use('/api/account', accountRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/schedules', scheduleRouter);

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });