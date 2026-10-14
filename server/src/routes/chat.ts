import { Router } from 'express';
import { db } from '../db/index.js';
import { chatMessages, chatGroups, chatGroupMembers, users, tasks, notifications } from '../db/schema.js';
import { eq, or, and, desc, inArray, ne } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastMessage, broadcastNotification, broadcastDataChange, broadcastMessagesSeen } from '../services/socket.js';
import { upload } from '../middleware/upload.js';
import { saveFile } from '../services/storage.js';

const router = Router();

function getDmChatId(u1: string, u2: string): string {
  return 'dm:' + [u1, u2].sort().join('|');
}

// Get all chats for current user
router.get('/chats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    // 1. All colleagues
    const allColleagues = await db.select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    }).from(users).where(or(eq(users.id, user.id) ? undefined : undefined));

    const colleagues = allColleagues.filter((u) => u.id !== user.id);

    // 2. User's group chats
    const groupMemberships = await db.select({ groupId: chatGroupMembers.groupId })
      .from(chatGroupMembers)
      .where(eq(chatGroupMembers.userId, user.id));

    const groupIds = groupMemberships.map((g) => g.groupId);
    let userGroups: any[] = [];
    if (groupIds.length) {
      userGroups = await db.query.chatGroups.findMany({
        where: inArray(chatGroups.id, groupIds),
        with: {
          members: {
            with: {
              user: { columns: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });
    }

    // 3. Assemble chat list
    const chats = [
      {
        id: 'announcement',
        name: 'Announcements',
        type: 'announcement',
        pinned: true,
      },
      ...colleagues.map((c) => ({
        id: getDmChatId(user.id, c.id),
        name: c.name,
        targetUserId: c.id,
        avatarUrl: c.avatarUrl,
        type: 'colleague',
        pinned: false,
      })),
      ...userGroups.map((g) => ({
        id: `group:${g.id}`,
        name: g.name,
        type: 'group',
        pinned: false,
        members: g.members.map((m: any) => m.user),
      })),
    ];

    // 4. Attach last message for each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (c) => {
        const [lastMsg] = await db.query.chatMessages.findMany({
          where: eq(chatMessages.chatId, c.id),
          orderBy: [desc(chatMessages.createdAt)],
          limit: 1,
          with: {
            fromUser: { columns: { id: true, name: true } },
          },
        });
        return {
          ...c,
          lastMessage: lastMsg || null,
        };
      })
    );

    return res.json(chatsWithLastMessage);
  } catch (error) {
    console.error('Fetch chats error:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get messages for chat
router.get('/messages/:chatId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;
    const user = req.user!;
    const now = new Date();

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.chatId, chatId),
      with: {
        fromUser: { columns: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [chatMessages.createdAt],
    });

    // Mark unread messages sent by others as seen by current user
    const unread = messages.filter(
      (m) => m.fromUserId !== user.id && !(m.seenByUserIds || []).includes(user.id)
    );

    if (unread.length > 0) {
      const unreadIds = unread.map((m) => m.id);
      for (const m of unread) {
        const updatedSeen = Array.from(new Set([...(m.seenByUserIds || []), user.id]));
        await db.update(chatMessages)
          .set({
            seenAt: now,
            seenByUserIds: updatedSeen,
          })
          .where(eq(chatMessages.id, m.id));

        m.seenAt = now;
        m.seenByUserIds = updatedSeen;
      }

      broadcastMessagesSeen(chatId, {
        chatId,
        seenByUserId: user.id,
        messageIds: unreadIds,
        seenAt: now,
      });
    }

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark messages as read in chat
router.post('/messages/:chatId/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;
    const user = req.user!;
    const now = new Date();

    const messages = await db.query.chatMessages.findMany({
      where: and(
        eq(chatMessages.chatId, chatId),
        ne(chatMessages.fromUserId, user.id)
      ),
    });

    const unread = messages.filter((m) => !(m.seenByUserIds || []).includes(user.id));
    if (unread.length > 0) {
      const unreadIds = unread.map((m) => m.id);
      for (const m of unread) {
        const updatedSeen = Array.from(new Set([...(m.seenByUserIds || []), user.id]));
        await db.update(chatMessages)
          .set({
            seenAt: now,
            seenByUserIds: updatedSeen,
          })
          .where(eq(chatMessages.id, m.id));
      }

      broadcastMessagesSeen(chatId, {
        chatId,
        seenByUserId: user.id,
        messageIds: unreadIds,
        seenAt: now,
      });
    }

    return res.json({ success: true, count: unread.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Upload file or image for chat message
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = await saveFile(req.file);
    return res.json({
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Chat file upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Send message
router.post('/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { chatId, text, kind, toUserId, due, attachments } = req.body;

    const cleanText = (text || '').trim();
    const cleanAttachments = Array.isArray(attachments) ? attachments : [];

    if (!cleanText && cleanAttachments.length === 0) {
      return res.status(400).json({ error: 'Message text or attachment is required' });
    }

    if (chatId === 'announcement' && user.role !== 'management') {
      return res.status(403).json({ error: 'Only management can post announcements' });
    }

    const [newMsg] = await db.insert(chatMessages).values({
      chatId,
      fromUserId: user.id,
      text: cleanText || (cleanAttachments.length ? `[Attachment: ${cleanAttachments[0].name || 'File'}]` : ''),
      kind: kind || 'Message',
      toUserId: toUserId || null,
      due: due || '',
      attachments: cleanAttachments,
    }).returning();

    // If kind is Task or Reminder, automatically create corresponding task in tasks table
    if (kind === 'Task' || kind === 'Reminder') {
      const today = new Date().toISOString().slice(0, 10);
      const recipientId = toUserId || (chatId.startsWith('dm:') ? chatId.slice(3).split('|').find((id: string) => id !== user.id) : user.id);

      const [task] = await db.insert(tasks).values({
        title: text.trim(),
        desc: `Sent from Inbox ${kind.toLowerCase()}`,
        date: due ? due.split(' ')[0] : today,
        time: due ? (due.split(' ')[1] || '09:00') : '09:00',
        whoUserId: recipientId,
        byUserId: user.id,
        type: kind,
        note: text.trim(),
        done: false,
      }).returning();

      // Trigger Task notification
      const [notif] = await db.insert(notifications).values({
        category: kind === 'Reminder' ? 'rem' : 'task',
        icon: kind === 'Reminder' ? 'bell' : 'task',
        color: kind === 'Reminder' ? '#db2777' : '#7c3aed',
        title: `${user.name} sent you a ${kind.toLowerCase()} in chat`,
        subtitle: text.trim(),
        keyType: 'task',
        targetId: task.id,
        byUserId: user.id,
        toUserIds: [recipientId],
      }).returning();

      broadcastNotification([recipientId], notif);
      broadcastDataChange('tasks', 'created', task);
    } else {
      // Direct message notification
      if (chatId.startsWith('dm:')) {
        const otherUserId = chatId.slice(3).split('|').find((id: string) => id !== user.id);
        if (otherUserId) {
          const [notif] = await db.insert(notifications).values({
            category: 'msg',
            icon: 'chat',
            color: '#0f766e',
            title: `New message from ${user.name}`,
            subtitle: text.trim(),
            keyType: 'chat',
            targetId: chatId,
            byUserId: user.id,
            toUserIds: [otherUserId],
          }).returning();
          broadcastNotification([otherUserId], notif);
        }
      }
    }

    const fullMsg = await db.query.chatMessages.findFirst({
      where: eq(chatMessages.id, newMsg.id),
      with: {
        fromUser: { columns: { id: true, name: true, avatarUrl: true } },
      },
    });

    broadcastMessage(chatId, fullMsg);
    return res.status(201).json(fullMsg);
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create group chat
router.post('/groups', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { name, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const [group] = await db.insert(chatGroups).values({
      name: name.trim(),
      createdBy: user.id,
    }).returning();

    const uniqueMembers = Array.from(new Set([user.id, ...(memberIds || [])]));
    await db.insert(chatGroupMembers).values(
      uniqueMembers.map((uid) => ({
        groupId: group.id,
        userId: uid,
      }))
    );

    broadcastDataChange('chats', 'group_created', group);
    return res.status(201).json(group);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

// Broadcast to multiple users
router.post('/broadcast', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { text, recipientIds, kind, due, attachments } = req.body;

    const cleanText = (text || '').trim();
    const cleanAttachments = Array.isArray(attachments) ? attachments : [];

    if ((!cleanText && cleanAttachments.length === 0) || !recipientIds?.length) {
      return res.status(400).json({ error: 'Text or attachment, and recipients are required' });
    }

    const createdMessages = [];
    for (const rId of recipientIds) {
      const dmId = getDmChatId(user.id, rId);
      const [msg] = await db.insert(chatMessages).values({
        chatId: dmId,
        fromUserId: user.id,
        text: cleanText || (cleanAttachments.length ? `[Attachment: ${cleanAttachments[0].name || 'File'}]` : ''),
        kind: kind || 'Message',
        isBroadcast: true,
        toUserId: rId,
        due: due || '',
        attachments: cleanAttachments,
      }).returning();

      if (kind === 'Task' || kind === 'Reminder') {
        const today = new Date().toISOString().slice(0, 10);
        await db.insert(tasks).values({
          title: text.trim(),
          desc: 'Sent from Broadcast',
          date: due ? due.split(' ')[0] : today,
          time: due ? (due.split(' ')[1] || '09:00') : '09:00',
          whoUserId: rId,
          byUserId: user.id,
          type: kind,
          note: text.trim(),
          done: false,
        });
      }

      broadcastMessage(dmId, msg);
      createdMessages.push(msg);
    }

    return res.json({ count: createdMessages.length });
  } catch (error) {
    return res.status(500).json({ error: 'Broadcast failed' });
  }
});

export default router;
