import { Router } from 'express';
import { db } from '../db/index.js';
import { notifications, userSettings } from '../db/schema.js';
import { desc, eq, inArray } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastNotification } from '../services/socket.js';

const router = Router();

// Create notification
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { category, icon, color, title, subtitle, keyType, targetId, toUserIds, isManagementOnly } = req.body;
    const recipientIds = toUserIds && Array.isArray(toUserIds) && toUserIds.length > 0 ? toUserIds : [user.id];

    const [notif] = await db.insert(notifications).values({
      category: category || 'task',
      icon: icon || 'bell',
      color: color || '#1fcb66',
      title,
      subtitle: subtitle || '',
      keyType: keyType || 'task',
      targetId: targetId || null,
      byUserId: user.id,
      toUserIds: recipientIds,
      isManagementOnly: !!isManagementOnly,
    }).returning();

    broadcastNotification(recipientIds, notif);
    return res.status(201).json(notif);
  } catch (error) {
    console.error('Failed to create notification:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

// List notifications
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const viewModeParam = req.query.viewMode as string | undefined;

    let isManagement = user.role === 'management';
    if (viewModeParam) {
      isManagement = user.role === 'management' && viewModeParam === 'management';
    } else {
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
      if (settings && settings.viewMode === 'employee') {
        isManagement = false;
      }
    }

    const allNotifs = await db.query.notifications.findMany({
      orderBy: [desc(notifications.createdAt)],
      limit: 60,
    });

    // Filter relevant notifications for current user
    const userNotifs = allNotifs.filter((n) => {
      const isSystemAlert = n.keyType === 'digest' || n.keyType === 'task_due' || n.keyType === 'task_overdue';

      // 1. Suppress own self-actions (notifications for actions the user performed themselves)
      if (!isSystemAlert && n.byUserId && n.byUserId === user.id) {
        return false;
      }

      // 2. Management check: if user is currently in employee view mode, hide management-only notifications
      if (n.isManagementOnly && !isManagement) {
        return false;
      }

      // 3. Employee mode strict personal scope:
      if (!isManagement) {
        const to = (n.toUserIds as string[]) || [];
        if (isSystemAlert) {
          if (to.length > 0 && !to.includes(user.id)) return false;
        } else {
          // Actions by others: must be targeted to this user (e.g. direct message, task assignment, approved report)
          if (!to.includes(user.id)) return false;
        }
      } else {
        // Management mode:
        const to = (n.toUserIds as string[]) || [];
        if (to.length > 0 && !to.includes(user.id) && !n.isManagementOnly) {
          return false;
        }
      }

      // Cleared check
      const cleared = (n.clearedByUserIds as Record<string, boolean>) || {};
      if (cleared[user.id]) return false;

      return true;
    }).map((n) => {
      const readMap = (n.readByUserIds as Record<string, boolean>) || {};
      return {
        ...n,
        read: !!readMap[user.id],
      };
    });

    return res.json(userNotifs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark single notification read
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const [existing] = await db.select().from(notifications).where(eq(notifications.id, id));

    if (existing) {
      const readMap = { ...((existing.readByUserIds as Record<string, boolean>) || {}), [user.id]: true };
      await db.update(notifications)
        .set({ readByUserIds: readMap })
        .where(eq(notifications.id, id));
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// Mark all read (supports optional ids array to mark only visible notifications read)
router.post('/read-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { ids } = req.body || {};

    let targets;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      targets = await db.select().from(notifications).where(inArray(notifications.id, ids));
    } else {
      targets = await db.select().from(notifications);
    }

    for (const n of targets) {
      const readMap = { ...((n.readByUserIds as Record<string, boolean>) || {}), [user.id]: true };
      await db.update(notifications)
        .set({ readByUserIds: readMap })
        .where(eq(notifications.id, n.id));
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark all read' });
  }
});

// Clear all notifications
router.post('/clear-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const all = await db.select().from(notifications);
    for (const n of all) {
      const clearMap = { ...((n.clearedByUserIds as Record<string, boolean>) || {}), [user.id]: true };
      await db.update(notifications)
        .set({ clearedByUserIds: clearMap })
        .where(eq(notifications.id, n.id));
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
