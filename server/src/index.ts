import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { initSocketIO } from './services/socket.js';
import { initDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import clientsRoutes from './routes/clients.js';
import servicesRoutes from './routes/services.js';
import tasksRoutes from './routes/tasks.js';
import notesRoutes from './routes/notes.js';
import commsRoutes from './routes/comms.js';
import reportsRoutes from './routes/reports.js';
import chatRoutes from './routes/chat.js';
import notifsRoutes from './routes/notifs.js';
import pipelinesRoutes from './routes/pipelines.js';
import documentsRoutes from './routes/documents.js';
import invoicesRoutes from './routes/invoices.js';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocketIO(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '25mb' }));

// Static uploads directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'buzzrdesk-server', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/clients', documentsRoutes);
app.use('/api/clients', invoicesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/comms', commsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifs', notifsRoutes);
app.use('/api/pipelines', pipelinesRoutes);

// Serve static client build if present (production deployment)
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const altClientDistPath = path.resolve(process.cwd(), 'client/dist');
const resolvedDistPath = [clientDistPath, altClientDistPath].find(p => path.resolve(p));

app.use(express.static(path.resolve(process.cwd(), '../client/dist')));
app.use(express.static(path.resolve(process.cwd(), 'client/dist')));

// Serve index.html for unknown non-API routes (SPA client routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const rootIndex = path.resolve(process.cwd(), 'client/dist/index.html');
  const parentIndex = path.resolve(process.cwd(), '../client/dist/index.html');
  res.sendFile(rootIndex, (err) => {
    if (err) {
      res.sendFile(parentIndex, (err2) => {
        if (err2) next();
      });
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Buzzrdesk server running on http://localhost:${PORT}`);
  try {
    await initDatabase();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
});
