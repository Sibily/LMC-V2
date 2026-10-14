import { Router } from 'express';
import { db } from '../db/index.js';
import { defaultPipelines } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireManagement, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange } from '../services/socket.js';

const router = Router();

// Get default pipeline
router.get('/default', authMiddleware, async (req, res) => {
  try {
    const [pipeline] = await db.select().from(defaultPipelines).where(eq(defaultPipelines.isDefault, true));
    if (!pipeline) {
      return res.status(404).json({ error: 'Default pipeline not found' });
    }
    return res.json(pipeline);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch default pipeline' });
  }
});

// Update default pipeline (Management only)
router.put('/default', authMiddleware, requireManagement, async (req: AuthRequest, res) => {
  try {
    const { stagesConfig } = req.body;
    if (!stagesConfig || !Array.isArray(stagesConfig)) {
      return res.status(400).json({ error: 'stagesConfig must be an array' });
    }

    const [existing] = await db.select().from(defaultPipelines).where(eq(defaultPipelines.isDefault, true));

    let updated;
    if (existing) {
      [updated] = await db.update(defaultPipelines)
        .set({
          stagesConfig,
          updatedAt: new Date(),
        })
        .where(eq(defaultPipelines.id, existing.id))
        .returning();
    } else {
      [updated] = await db.insert(defaultPipelines).values({
        stagesConfig,
        isDefault: true,
      }).returning();
    }

    broadcastDataChange('pipelines', 'updated', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update default pipeline' });
  }
});

export default router;
