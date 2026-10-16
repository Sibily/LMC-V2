import { Router } from 'express';
import { db } from '../db/index.js';
import { services, serviceHistory, clients, tasks, notifications, defaultPipelines } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange, broadcastNotification } from '../services/socket.js';

const router = Router();

// Add service to client
router.post('/client/:clientId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const { name, respUserId, stagesConfig } = req.body;
    const user = req.user!;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    let stages = stagesConfig;
    if (!stages || !stages.length) {
      const [def] = await db.select().from(defaultPipelines).where(eq(defaultPipelines.isDefault, true));
      stages = def?.stagesConfig || [];
    }

    const curStageId = stages[0]?.id || 'st_1';
    const today = new Date().toISOString().slice(0, 10);

    const [newService] = await db.insert(services).values({
      clientId,
      name: name.trim(),
      curStageId,
      respUserId: respUserId || user.id,
      nextAction: 'Call client',
      updDate: today,
      stagesConfig: stages,
    }).returning();

    const curStage = stages.find((s: any) => s.id === curStageId) || stages[0];
    const timeNow = new Date().toTimeString().slice(0, 5);

    // Initial history log entry as in prototype
    await db.insert(serviceHistory).values({
      serviceId: newService.id,
      stageName: curStage?.name || 'Enquiry',
      note: 'Initial update.',
      byUserId: respUserId || user.id,
      atDate: `${today} ${timeNow}`,
      nextAction: 'Call client',
      assignUserId: respUserId || user.id,
      acts: [],
    });

    // Notification
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    const [notif] = await db.insert(notifications).values({
      category: 'client',
      icon: 'flag',
      color: '#2563eb',
      title: `${user.name} added a service`,
      subtitle: `${client?.name || 'Client'} · ${newService.name}`,
      keyType: 'client',
      targetId: clientId,
      byUserId: user.id,
      isManagementOnly: true,
    }).returning();

    broadcastNotification([], notif);
    broadcastDataChange('services', 'created', newService);

    return res.status(201).json(newService);
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, respUserId, nextAction } = req.body;

    const [updated] = await db.update(services)
      .set({
        name: name !== undefined ? name.trim() : undefined,
        respUserId: respUserId !== undefined ? respUserId : undefined,
        nextAction: nextAction !== undefined ? nextAction : undefined,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    broadcastDataChange('services', 'updated', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(services).where(eq(services.id, id));
    broadcastDataChange('services', 'deleted', { id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Update stage progress
router.post('/:id/stage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { stageId, stageName, note, nextAction, followUpDate, followUpTime, assignUserId, keepCurrent, acts } = req.body;
    const user = req.user!;

    const [service] = await db.select().from(services).where(eq(services.id, id));
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const [client] = await db.select().from(clients).where(eq(clients.id, service.clientId));

    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5);

    // Update service
    const [updatedService] = await db.update(services)
      .set({
        curStageId: !keepCurrent ? stageId : service.curStageId,
        nextAction: nextAction || service.nextAction,
        updDate: today,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    // Log history
    await db.insert(serviceHistory).values({
      serviceId: id,
      stageName: stageName || 'Updated',
      note: note || '',
      byUserId: user.id,
      atDate: `${today} ${timeNow}`,
      nextAction: nextAction || '',
      assignUserId: assignUserId || user.id,
      followUpDate: followUpDate || '',
      followUpTime: followUpTime || '',
      acts: Array.isArray(acts) ? acts : [],
    });

    // Auto-create Completed Update Task
    await db.insert(tasks).values({
      title: `${client?.name || 'Client'}: ${service.name}`,
      desc: `${keepCurrent ? 'Stayed at' : 'Moved to'} ${stageName}${note ? ' — ' + note : ''}`,
      date: today,
      time: timeNow,
      whoUserId: user.id,
      byUserId: user.id,
      clientId: client?.id,
      serviceId: service.id,
      type: 'Update',
      stageName: stageName || '',
      note: note || '',
      done: true,
      doneAt: today,
      doneTime: timeNow,
      doneNote: note || '',
    });

    // If next action provided, create a reminder task
    if (nextAction) {
      await db.insert(tasks).values({
        title: nextAction,
        desc: note || '',
        date: followUpDate || today,
        time: followUpTime || '09:00',
        whoUserId: assignUserId || user.id,
        byUserId: user.id,
        clientId: client?.id,
        serviceId: service.id,
        type: 'Reminder',
        stageName: stageName || '',
        note: note || '',
        done: false,
      });
    }

    // Broadcast notification
    const [notif] = await db.insert(notifications).values({
      category: 'client',
      icon: 'flag',
      color: '#2563eb',
      title: `${user.name} moved ${service.name} to ${stageName}`,
      subtitle: client?.name || 'Client update',
      keyType: 'client',
      targetId: client?.id,
      byUserId: user.id,
      isManagementOnly: true,
    }).returning();

    broadcastNotification([], notif);
    broadcastDataChange('services', 'stage_updated', updatedService);

    return res.json(updatedService);
  } catch (error) {
    console.error('Update stage error:', error);
    return res.status(500).json({ error: 'Failed to update stage' });
  }
});

// Decide Yes/No on decision stage
router.post('/:id/decide', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { decisionStageId, result, note, nextAction, followUpDate, followUpTime } = req.body; // result: 'yes' | 'no'
    const user = req.user!;

    const [service] = await db.select().from(services).where(eq(services.id, id));
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const [client] = await db.select().from(clients).where(eq(clients.id, service.clientId));

    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5);

    const stages = service.stagesConfig as any[];
    const decIndex = stages.findIndex((s) => s.id === decisionStageId);
    if (decIndex >= 0) {
      stages[decIndex].res = result;
    }

    // If yes and next stage exists, advance to next stage
    let nextStageId = service.curStageId;
    if (result === 'yes' && stages[decIndex + 1]) {
      nextStageId = stages[decIndex + 1].id;
    }

    const decisionLabel = result === 'yes' ? (stages[decIndex]?.yes || 'Accepted') : (stages[decIndex]?.no || 'Rejected');

    const [updatedService] = await db.update(services)
      .set({
        curStageId: nextStageId,
        stagesConfig: stages,
        nextAction: nextAction || service.nextAction,
        updDate: today,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    // Log history
    await db.insert(serviceHistory).values({
      serviceId: id,
      stageName: decisionLabel,
      note: note || '',
      byUserId: user.id,
      atDate: `${today} ${timeNow}`,
      nextAction: nextAction || '',
      assignUserId: user.id,
      followUpDate: followUpDate || '',
      followUpTime: followUpTime || '',
    });

    // Auto-create Completed Decision Task
    await db.insert(tasks).values({
      title: `${client?.name || 'Client'}: ${service.name}`,
      desc: `Decision: ${decisionLabel}${note ? ' — ' + note : ''}`,
      date: today,
      time: timeNow,
      whoUserId: user.id,
      byUserId: user.id,
      clientId: client?.id,
      serviceId: service.id,
      type: 'Update',
      stageName: decisionLabel,
      note: note || '',
      done: true,
      doneAt: today,
      doneTime: timeNow,
      doneNote: note || '',
    });

    if (nextAction) {
      await db.insert(tasks).values({
        title: nextAction,
        desc: note || '',
        date: followUpDate || today,
        time: followUpTime || '09:00',
        whoUserId: user.id,
        byUserId: user.id,
        clientId: client?.id,
        serviceId: service.id,
        type: 'Reminder',
        stageName: decisionLabel,
        note: note || '',
        done: false,
      });
    }

    broadcastDataChange('services', 'decided', updatedService);
    return res.json(updatedService);
  } catch (error) {
    console.error('Decision error:', error);
    return res.status(500).json({ error: 'Failed to process decision' });
  }
});

// Customize service pipeline
router.put('/:id/pipeline', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { stagesConfig } = req.body;

    const [updated] = await db.update(services)
      .set({
        stagesConfig,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    broadcastDataChange('services', 'pipeline_customized', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to customize pipeline' });
  }
});

// Get service catalog
router.get('/catalog', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { serviceCatalog } = await import('../db/schema.js');
    const items = await db.select().from(serviceCatalog);
    return res.json(items.map(i => i.name));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch service catalog' });
  }
});

// Add custom service to catalog
router.post('/catalog', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const { serviceCatalog } = await import('../db/schema.js');
    const [inserted] = await db.insert(serviceCatalog).values({
      name: name.trim(),
      category: category || 'Legal',
    }).onConflictDoNothing().returning();
    return res.status(201).json(inserted || { name: name.trim() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add service to catalog' });
  }
});

export default router;
