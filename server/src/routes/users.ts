import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, userSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireManagement, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { saveFile } from '../services/storage.js';
import { broadcastDataChange } from '../services/socket.js';

const router = Router();

// List all team members
router.get('/', authMiddleware, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    }).from(users);

    return res.json(allUsers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Add new team member (Management only)
router.post('/', authMiddleware, requireManagement, async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: role === 'management' ? 'management' : 'employee',
    }).returning();

    await db.insert(userSettings).values({
      userId: newUser.id,
      viewMode: newUser.role,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    broadcastDataChange('users', 'created', safeUser);
    return res.status(201).json(safeUser);
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user profile / credentials (Self or Management)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const isSelf = req.user!.id === id;
    const isMgmt = req.user!.role === 'management';

    if (!isSelf && !isMgmt) {
      return res.status(403).json({ error: 'Permission denied to update this user' });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateData.name = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail));
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }
      updateData.email = cleanEmail;
    }

    if (password !== undefined && password !== null && String(password).trim() !== '') {
      const cleanPass = String(password).trim();
      if (cleanPass.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.passwordHash = await bcrypt.hash(cleanPass, 10);
    }

    if (role !== undefined) {
      if (!['management', 'employee'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (!isMgmt) {
        return res.status(403).json({ error: 'Only management can change user roles' });
      }
      if (role === 'employee') {
        const mgmtUsers = await db.select().from(users).where(eq(users.role, 'management'));
        if (mgmtUsers.length <= 1 && mgmtUsers.some((m) => m.id === id)) {
          return res.status(400).json({ error: 'Cannot demote the last management user' });
        }
      }
      updateData.role = role;
    }

    const [updated] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, ...safeUser } = updated;
    broadcastDataChange('users', 'updated', safeUser);
    return res.json(safeUser);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update role (Management only)
router.put('/:id/role', authMiddleware, requireManagement, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['management', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'employee') {
      const mgmtUsers = await db.select().from(users).where(eq(users.role, 'management'));
      if (mgmtUsers.length <= 1 && mgmtUsers.some((m) => m.id === id)) {
        return res.status(400).json({ error: 'Cannot demote the last management user' });
      }
    }

    const [updated] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...safeUser } = updated;
    broadcastDataChange('users', 'role_updated', safeUser);
    return res.json(safeUser);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (Management only)
router.delete('/:id', authMiddleware, requireManagement, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await db.delete(users).where(eq(users.id, id));
    broadcastDataChange('users', 'deleted', { id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Upload profile avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const avatarUrl = await saveFile(req.file);
    const [updated] = await db.update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning();

    broadcastDataChange('users', 'avatar_updated', { id: req.user!.id, avatarUrl });
    return res.json({ avatarUrl, user: updated });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;
