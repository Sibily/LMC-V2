import { Router } from 'express';
import { db } from '../db/index.js';
import { clients, clientMembers, services, users, notifications } from '../db/schema.js';
import { eq, or, inArray, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange, broadcastNotification } from '../services/socket.js';

const router = Router();

// List clients
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const isManagement = user.role === 'management';

    let userClientIds: string[] = [];
    if (!isManagement) {
      const memberships = await db.select({ clientId: clientMembers.clientId })
        .from(clientMembers)
        .where(eq(clientMembers.userId, user.id));
      userClientIds = memberships.map(m => m.clientId);
    }

    const clientRows = await db.query.clients.findMany({
      where: isManagement ? undefined : (table) => or(eq(table.ownerId, user.id), userClientIds.length ? inArray(table.id, userClientIds) : undefined),
      with: {
        owner: {
          columns: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          with: {
            user: {
              columns: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        services: true,
      },
      orderBy: [desc(clients.createdAt)],
    });

    return res.json(clientRows);
  } catch (error) {
    console.error('Fetch clients error:', error);
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Create client
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { type, name, company, phone, email, loc, source, status, ownerId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const assignedOwnerId = (user.role === 'management' && ownerId) ? ownerId : user.id;

    const [newClient] = await db.insert(clients).values({
      type: type || 'Individual',
      name: name.trim(),
      company: company || '',
      phone: phone || '',
      email: email || '',
      loc: loc || '',
      source: source || '',
      status: status || 'Active Client',
      ownerId: assignedOwnerId,
    }).returning();

    // Auto-create notification for admins and assigned owner
    const recipientIds = assignedOwnerId && assignedOwnerId !== user.id ? [assignedOwnerId] : [];
    const [notif] = await db.insert(notifications).values({
      category: 'client',
      icon: 'adduser',
      color: '#16a34a',
      title: `${user.name} added a new client`,
      subtitle: newClient.name,
      keyType: 'client',
      targetId: newClient.id,
      byUserId: user.id,
      toUserIds: recipientIds,
      isManagementOnly: recipientIds.length === 0,
    }).returning();

    broadcastNotification(recipientIds, notif);
    broadcastDataChange('clients', 'created', newClient);

    return res.status(201).json(newClient);
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({ error: 'Failed to create client' });
  }
});

// Get client by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: {
        owner: {
          columns: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          with: {
            user: {
              columns: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        services: {
          with: {
            responsibleUser: {
              columns: { id: true, name: true, email: true },
            },
            history: {
              with: {
                byUser: { columns: { id: true, name: true } },
                assignedUser: { columns: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json(client);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Update client
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { type, name, company, phone, email, loc, source, status, ownerId } = req.body;

    const [updated] = await db.update(clients)
      .set({
        type: type !== undefined ? type : undefined,
        name: name !== undefined ? name.trim() : undefined,
        company: company !== undefined ? company : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        loc: loc !== undefined ? loc : undefined,
        source: source !== undefined ? source : undefined,
        status: status !== undefined ? status : undefined,
        ownerId: ownerId !== undefined ? ownerId : undefined,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Client not found' });
    }

    broadcastDataChange('clients', 'updated', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(clients).where(eq(clients.id, id));
    broadcastDataChange('clients', 'deleted', { id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Add person to client
router.post('/:id/members', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId, permission } = req.body;

    const [existing] = await db.select().from(clientMembers).where(
      eq(clientMembers.clientId, id)
    );

    const [newMember] = await db.insert(clientMembers).values({
      clientId: id,
      userId,
      permission: permission || 'Viewer',
    }).returning();

    broadcastDataChange('clients', 'member_added', { clientId: id, newMember });
    return res.status(201).json(newMember);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add client member' });
  }
});

// Remove person from client
router.delete('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;
    await db.delete(clientMembers).where(
      eq(clientMembers.clientId, id)
    );
    broadcastDataChange('clients', 'member_removed', { clientId: id, userId });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
