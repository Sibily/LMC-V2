import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

let io: Server | null = null;
const JWT_SECRET = process.env.JWT_SECRET || 'buzzrdesk_jwt_secret_key_super_secure_2026';

export function initSocketIO(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(); // Allow anonymous connection, but they won't join private rooms
    }
    try {
      const decoded = jwt.verify(String(token), JWT_SECRET) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      socket.join('team');
      try {
        const [u] = await db.select().from(users).where(eq(users.id, userId));
        if (u) {
          socket.data.role = u.role;
          socket.join(`role:${u.role}`);
        }
      } catch (e) {}
      console.log(`🔌 User connected: ${userId} (socket ${socket.id})`);
    }

    socket.on('join_chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

export function broadcastMessage(chatId: string, message: any) {
  if (!io) return;
  io.to(`chat:${chatId}`).emit('new_message', message);
  // Also send to team room so inbox unread counters update
  io.to('team').emit('chat_activity', { chatId, message });
}

export function broadcastNotification(toUserIds: string[], notification: any) {
  if (!io) return;
  const socketServer = io;
  if (notification.isManagementOnly) {
    socketServer.to('role:management').emit('new_notification', notification);
    return;
  }
  if (!toUserIds || toUserIds.length === 0) {
    socketServer.to('team').emit('new_notification', notification);
    return;
  }
  toUserIds.forEach((uid) => {
    socketServer.to(`user:${uid}`).emit('new_notification', notification);
  });
}

export function broadcastDataChange(entity: string, action: string, data?: any) {
  if (!io) return;
  io.to('team').emit('data_mutation', { entity, action, data });
}

export function broadcastMessagesSeen(chatId: string, payload: { chatId: string; seenByUserId: string; messageIds: string[]; seenAt: Date }) {
  if (!io) return;
  io.to(`chat:${chatId}`).emit('messages_seen', payload);
  io.to('team').emit('messages_seen', payload);
}
