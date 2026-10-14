import { Router } from 'express';
import { db } from '../db/index.js';
import { reports, users, notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange, broadcastNotification } from '../services/socket.js';

const router = Router();

// List reports
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { userId, frequency, periodKey } = req.query;

    const conditions = [];
    if (userId) {
      conditions.push(eq(reports.userId, String(userId)));
    } else if (user.role !== 'management') {
      conditions.push(eq(reports.userId, user.id));
    }
    if (frequency) conditions.push(eq(reports.frequency, String(frequency)));
    if (periodKey) conditions.push(eq(reports.periodKey, String(periodKey)));

    const allReports = await db.query.reports.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [desc(reports.createdAt)],
    });

    return res.json(allReports);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Submit or update a report
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { frequency, periodKey, note } = req.body;

    if (!frequency || !periodKey) {
      return res.status(400).json({ error: 'Frequency and period key are required' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5);
    const submittedAt = `${today} ${timeNow}`;

    // Check if report already exists for this user, frequency, and periodKey
    const [existing] = await db.select().from(reports).where(
      and(
        eq(reports.userId, user.id),
        eq(reports.frequency, frequency),
        eq(reports.periodKey, periodKey)
      )
    );

    let reportRecord;
    if (existing) {
      [reportRecord] = await db.update(reports)
        .set({
          note: note !== undefined ? note : existing.note,
          submittedAt,
        })
        .where(eq(reports.id, existing.id))
        .returning();
    } else {
      [reportRecord] = await db.insert(reports).values({
        userId: user.id,
        frequency,
        periodKey,
        note: note || '',
        submittedAt,
      }).returning();
    }

    // Notify management
    const [notif] = await db.insert(notifications).values({
      category: 'report',
      icon: 'report',
      color: '#db2777',
      title: `${user.name} submitted the ${frequency} report`,
      subtitle: `Period: ${periodKey}`,
      keyType: 'emp',
      targetId: user.id,
      byUserId: user.id,
      isManagementOnly: true,
    }).returning();

    broadcastNotification([], notif);
    broadcastDataChange('reports', 'submitted', reportRecord);

    return res.json(reportRecord);
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Acknowledge / Approve a report
router.post('/:id/acknowledge', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'management') {
      return res.status(403).json({ error: 'Only management can acknowledge reports' });
    }

    const { id } = req.params;
    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5);
    const acknowledgedAt = `${today} ${timeNow}`;

    const [updated] = await db.update(reports)
      .set({
        status: 'approved',
        acknowledgedAt,
        acknowledgedBy: user.id,
      })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Send notification to the employee
    const [notif] = await db.insert(notifications).values({
      category: 'report',
      icon: 'tick',
      color: '#10b981',
      title: `${user.name} approved your ${updated.frequency} report`,
      subtitle: `Period: ${updated.periodKey}`,
      keyType: 'task',
      targetId: null,
      byUserId: user.id,
      toUserIds: [updated.userId],
    }).returning();

    broadcastNotification([updated.userId], notif);
    broadcastDataChange('reports', 'acknowledged', updated);

    return res.json(updated);
  } catch (error) {
    console.error('Acknowledge report error:', error);
    return res.status(500).json({ error: 'Failed to acknowledge report' });
  }
});

export default router;
