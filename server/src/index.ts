import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { initSocketIO } from './services/socket.js';
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
app.use('/api/services', servicesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/comms', commsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifs', notifsRoutes);
app.use('/api/pipelines', pipelinesRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Buzzrdesk server running on http://localhost:${PORT}`);
});
