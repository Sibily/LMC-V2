import { Router } from 'express';
import { db } from '../db/index.js';
import { tasks, users, clients, services, notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange, broadcastNotification } from '../services/socket.js';

const router = Router();

// List tasks
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const isManagement = user.role === 'management';
    const { whoUserId, date, done, type, clientId } = req.query;

    let targetUserId: string | undefined = undefined;
    if (isManagement) {
      if (whoUserId && whoUserId !== 'all') {
        targetUserId = String(whoUserId);
      }
    } else {
      targetUserId = user.id;
    }

    const conditions = [];
    if (targetUserId) conditions.push(eq(tasks.whoUserId, targetUserId));
    if (date) conditions.push(eq(tasks.date, String(date)));
    if (done !== undefined) conditions.push(eq(tasks.done, done === 'true'));
    const targetClientId = clientId || req.query.cid;
    if (type) conditions.push(eq(tasks.type, String(type)));
    if (targetClientId) conditions.push(eq(tasks.clientId, String(targetClientId)));

    const allTasks = await db.query.tasks.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        whoUser: { columns: { id: true, name: true, avatarUrl: true } },
        byUser: { columns: { id: true, name: true } },
        client: { columns: { id: true, name: true, company: true } },
        service: { columns: { id: true, name: true } },
      },
      orderBy: [desc(tasks.date), desc(tasks.time)],
    });

    return res.json(allTasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task or reminder
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { title, desc: description, date, time, whoUserId, clientId, serviceId, type, note } = req.body;
    const assignedClientId = clientId || req.body.cid || null;
    const assignedServiceId = serviceId || req.body.sid || null;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const assignedUserId = whoUserId || user.id;

    const [newTask] = await db.insert(tasks).values({
      title: title.trim(),
      desc: description || '',
      date: date || new Date().toISOString().slice(0, 10),
      time: time || '09:00',
      whoUserId: assignedUserId,
      byUserId: user.id,
      clientId: assignedClientId,
      serviceId: assignedServiceId,
      type: type || 'Task',
      note: note || '',
      done: false,
    }).returning();

    // If assigned to another user, trigger notification
    if (assignedUserId !== user.id) {
      const isReminder = type === 'Reminder';
      const [notif] = await db.insert(notifications).values({
        category: isReminder ? 'rem' : 'task',
        icon: isReminder ? 'bell' : 'task',
        color: isReminder ? '#db2777' : '#7c3aed',
        title: `${user.name} ${isReminder ? 'set a reminder for you' : 'assigned you a task'}`,
        subtitle: `${newTask.title} · ${newTask.date} ${newTask.time}`,
        keyType: 'task',
        targetId: newTask.id,
        byUserId: user.id,
        toUserIds: [assignedUserId],
      }).returning();

      broadcastNotification([assignedUserId], notif);
    }

    broadcastDataChange('tasks', 'created', newTask);
    return res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, desc: description, date, time, whoUserId, clientId, serviceId, type, note, doneNote } = req.body;

    const [updated] = await db.update(tasks)
      .set({
        title: title !== undefined ? title.trim() : undefined,
        desc: description !== undefined ? description : undefined,
        date: date !== undefined ? date : undefined,
        time: time !== undefined ? time : undefined,
        whoUserId: whoUserId !== undefined ? whoUserId : undefined,
        clientId: clientId !== undefined ? clientId : undefined,
        serviceId: serviceId !== undefined ? serviceId : undefined,
        type: type !== undefined ? type : undefined,
        note: note !== undefined ? note : undefined,
        doneNote: doneNote !== undefined ? doneNote : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }

    broadcastDataChange('tasks', 'updated', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// Toggle complete/reopen task
router.post('/:id/toggle', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { doneNote } = req.body;
    const user = req.user!;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newDone = !task.done;
    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5);

    const [updated] = await db.update(tasks)
      .set({
        done: newDone,
        doneAt: newDone ? today : null,
        doneTime: newDone ? timeNow : null,
        doneNote: newDone ? (doneNote || task.doneNote || '') : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    // If linked to a client service, automatically log task activity into service history
    if (task.clientId && task.serviceId) {
      try {
        const { serviceHistory, services: sTable } = await import('../db/schema.js');
        const [srv] = await db.select().from(sTable).where(eq(sTable.id, task.serviceId));
        const stageName = srv ? ((srv.stagesConfig as any[]).find(s => s.id === srv.curStageId)?.name || 'Task update') : 'Task update';
        const verb = newDone ? 'Task completed' : 'Task reopened';
        const actNote = doneNote || task.doneNote || task.note || '';

        await db.insert(serviceHistory).values({
          serviceId: task.serviceId,
          stageName,
          note: `${verb}: ${task.title}`,
          byUserId: user.id,
          atDate: `${today} ${timeNow}`,
          nextAction: '',
          assignUserId: task.whoUserId || user.id,
          followUpDate: '',
          followUpTime: '',
          acts: [{
            id: `act-${task.id}-${Date.now()}`,
            kind: task.type === 'Reminder' ? 'Reminder' : task.type === 'Note' ? 'Note' : 'Task',
            title: task.title,
            body: actNote,
            who: user.name,
            tid: task.id,
            date: today,
            time: timeNow,
          }],
        });
        broadcastDataChange('services', 'history_added', { serviceId: task.serviceId });
      } catch (err) {
        console.error('Failed to log task activity:', err);
      }
    }

    // If marked complete, send notification to creator if creator != current user
    if (newDone && task.byUserId && task.byUserId !== user.id) {
      const [notif] = await db.insert(notifications).values({
        category: 'task',
        icon: 'checks',
        color: '#15803d',
        title: `${user.name} completed a task`,
        subtitle: task.title,
        keyType: 'task',
        targetId: task.id,
        byUserId: user.id,
        toUserIds: [task.byUserId],
      }).returning();

      broadcastNotification([task.byUserId], notif);
    }

    broadcastDataChange('tasks', 'toggled', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle task status' });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(tasks).where(eq(tasks.id, id));
    broadcastDataChange('tasks', 'deleted', { id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
