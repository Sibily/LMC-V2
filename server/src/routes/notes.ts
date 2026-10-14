import { Router } from 'express';
import { db } from '../db/index.js';
import { notes, clients, users } from '../db/schema.js';
import { eq, or, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange } from '../services/socket.js';

const router = Router();

// List notes
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const clientId = (req.query.clientId as string) || (req.query.cid as string);

    const allNotes = await db.query.notes.findMany({
      where: clientId
        ? eq(notes.clientId, String(clientId))
        : or(eq(notes.byUserId, user.id), user.role === 'management' ? undefined : undefined),
      with: {
        client: { columns: { id: true, name: true } },
        byUser: { columns: { id: true, name: true } },
      },
      orderBy: [desc(notes.createdAt)],
    });

    return res.json(allNotes);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create note
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { title, body } = req.body;
    const clientId = req.body.clientId || req.body.cid || null;

    if (!title?.trim() && !body?.trim()) {
      return res.status(400).json({ error: 'Note title or body is required' });
    }

    const [newNote] = await db.insert(notes).values({
      title: title?.trim() || 'Note',
      body: body?.trim() || '',
      clientId,
      byUserId: user.id,
    }).returning();

    broadcastDataChange('notes', 'created', newNote);
    return res.status(201).json(newNote);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, body, clientId } = req.body;

    const [updated] = await db.update(notes)
      .set({
        title: title !== undefined ? title.trim() : undefined,
        body: body !== undefined ? body.trim() : undefined,
        clientId: clientId !== undefined ? clientId : undefined,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Note not found' });
    }

    broadcastDataChange('notes', 'updated', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(notes).where(eq(notes.id, id));
    broadcastDataChange('notes', 'deleted', { id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
