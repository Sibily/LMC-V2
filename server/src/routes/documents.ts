import { Router } from 'express';
import { db } from '../db/index.js';
import { clientDocuments, clients } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange } from '../services/socket.js';

const router = Router();

// List documents for a client
router.get('/:clientId/docs', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const docs = await db.query.clientDocuments.findMany({
      where: eq(clientDocuments.clientId, clientId),
      with: {
        service: true,
      },
      orderBy: [desc(clientDocuments.createdAt)],
    });
    return res.json(docs);
  } catch (error) {
    console.error('Fetch docs error:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Add document to client
router.post('/:clientId/docs', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const { name, type, customType, serviceId, note, fileName, fileSize, fileUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Document name is required' });
    }

    const [newDoc] = await db.insert(clientDocuments).values({
      clientId,
      name: name.trim(),
      type: type || 'Other',
      customType: customType || '',
      serviceId: serviceId || null,
      note: note || '',
      fileName: fileName || '',
      fileSize: String(fileSize || 0),
      fileUrl: fileUrl || '',
    }).returning();

    broadcastDataChange('clients', 'doc_created', { clientId, doc: newDoc });
    return res.status(201).json(newDoc);
  } catch (error) {
    console.error('Create doc error:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:clientId/docs/:docId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId, docId } = req.params;
    const { name, type, customType, serviceId, note, fileName, fileSize, fileUrl } = req.body;

    const [updated] = await db.update(clientDocuments)
      .set({
        name: name !== undefined ? name.trim() : undefined,
        type: type !== undefined ? type : undefined,
        customType: customType !== undefined ? customType : undefined,
        serviceId: serviceId !== undefined ? serviceId : undefined,
        note: note !== undefined ? note : undefined,
        fileName: fileName !== undefined ? fileName : undefined,
        fileSize: fileSize !== undefined ? String(fileSize) : undefined,
        fileUrl: fileUrl !== undefined ? fileUrl : undefined,
        updatedAt: new Date(),
      })
      .where(eq(clientDocuments.id, docId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    broadcastDataChange('clients', 'doc_updated', { clientId, doc: updated });
    return res.json(updated);
  } catch (error) {
    console.error('Update doc error:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:clientId/docs/:docId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId, docId } = req.params;
    await db.delete(clientDocuments).where(eq(clientDocuments.id, docId));
    broadcastDataChange('clients', 'doc_deleted', { clientId, docId });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete doc error:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
