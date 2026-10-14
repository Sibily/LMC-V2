import { Router } from 'express';
import { db } from '../db/index.js';
import { communications, tasks, clients, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange } from '../services/socket.js';

const router = Router();

// List communications for client
router.get('/client/:clientId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const comms = await db.query.communications.findMany({
      where: eq(communications.clientId, clientId),
      with: {
        byUser: { columns: { id: true, name: true, avatarUrl: true } },
        task: true,
      },
      orderBy: [desc(communications.loggedAt)],
    });

    return res.json(comms);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch communications' });
  }
});

// Create communication
router.post('/client/:clientId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const { type, byUserId, withUserIds, date, time, details, followUp } = req.body;
    const user = req.user!;

    if (!details || !details.trim()) {
      return res.status(400).json({ error: 'Communication details are required' });
    }

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    let createdTaskId: string | null = null;
    if (followUp && followUp.enabled) {
      const [task] = await db.insert(tasks).values({
        title: followUp.what || `Follow up · ${client?.name || 'Client'}`,
        desc: details.trim(),
        date: followUp.date || date,
        time: followUp.time || '09:00',
        whoUserId: followUp.whoUserId || user.id,
        byUserId: user.id,
        clientId,
        type: followUp.type || 'Task',
        note: details.trim(),
        done: false,
      }).returning();
      createdTaskId = task.id;
    }

    const [newComm] = await db.insert(communications).values({
      clientId,
      type: type || 'WhatsApp message',
      byUserId: byUserId || user.id,
      withUserIds: withUserIds || [],
      date: date || new Date().toISOString().slice(0, 10),
      time: time || new Date().toTimeString().slice(0, 5),
      details: details.trim(),
      followDate: followUp?.enabled ? followUp.date : '',
      followTime: followUp?.enabled ? followUp.time : '',
      followType: followUp?.enabled ? followUp.type : '',
      taskId: createdTaskId,
      source: 'Manual',
    }).returning();

    broadcastDataChange('comms', 'created', newComm);
    return res.status(201).json(newComm);
  } catch (error) {
    console.error('Create comms error:', error);
    return res.status(500).json({ error: 'Failed to create communication' });
  }
});

// Update communication
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { type, byUserId, withUserIds, date, time, details, followUp } = req.body;
    const user = req.user!;

    const [existing] = await db.select().from(communications).where(eq(communications.id, id));
    if (!existing) return res.status(404).json({ error: 'Communication not found' });

    let taskId = existing.taskId;
    if (followUp && followUp.enabled) {
      if (taskId) {
        await db.update(tasks).set({
          title: followUp.what || undefined,
          date: followUp.date || undefined,
          time: followUp.time || undefined,
          type: followUp.type || undefined,
          whoUserId: followUp.whoUserId || undefined,
          updatedAt: new Date(),
        }).where(eq(tasks.id, taskId));
      } else {
        const [task] = await db.insert(tasks).values({
          title: followUp.what || `Follow up`,
          desc: details || '',
          date: followUp.date,
          time: followUp.time || '09:00',
          whoUserId: followUp.whoUserId || user.id,
          byUserId: user.id,
          clientId: existing.clientId,
          type: followUp.type || 'Task',
          done: false,
        }).returning();
        taskId = task.id;
      }
    } else if (taskId && followUp && !followUp.enabled) {
      await db.delete(tasks).where(eq(tasks.id, taskId));
      taskId = null;
    }

    const [updated] = await db.update(communications).set({
      type: type !== undefined ? type : undefined,
      byUserId: byUserId !== undefined ? byUserId : undefined,
      withUserIds: withUserIds !== undefined ? withUserIds : undefined,
      date: date !== undefined ? date : undefined,
      time: time !== undefined ? time : undefined,
      details: details !== undefined ? details.trim() : undefined,
      followDate: followUp?.enabled ? followUp.date : '',
      followTime: followUp?.enabled ? followUp.time : '',
      followType: followUp?.enabled ? followUp.type : '',
      taskId,
      updatedAt: new Date(),
    }).where(eq(communications.id, id)).returning();

    broadcastDataChange('comms', 'updated', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update communication' });
  }
});

// Delete communication
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(communications).where(eq(communications.id, id));
    if (existing?.taskId) {
      await db.delete(tasks).where(eq(tasks.id, existing.taskId));
    }
    await db.delete(communications).where(eq(communications.id, id));
    broadcastDataChange('comms', 'deleted', { id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete communication' });
  }
});

export default router;
