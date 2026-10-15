import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, userSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!user && cleanEmail === 'nujoom@lmc.com') {
      // Auto-provision initial management user if database was just provisioned
      const passwordHash = await bcrypt.hash('admin123', 10);
      [user] = await db.insert(users).values({
        name: 'Nujoom',
        email: 'nujoom@lmc.com',
        passwordHash,
        role: 'management',
      }).returning();

      await db.insert(userSettings).values({
        userId: user.id,
        viewMode: 'management',
      }).onConflictDoNothing();
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    let [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
    if (!settings) {
      [settings] = await db.insert(userSettings).values({
        userId: user.id,
        viewMode: user.role === 'management' ? 'management' : 'employee',
      }).returning();
    } else if (user.role === 'management' && settings.viewMode !== 'management') {
      [settings] = await db.update(userSettings)
        .set({ viewMode: 'management', updatedAt: new Date() })
        .where(eq(userSettings.userId, user.id))
        .returning();
    }

    const { passwordHash, ...userSafe } = user;
    return res.json({ token, user: userSafe, settings });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    let [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
    if (!settings) {
      [settings] = await db.insert(userSettings).values({
        userId: user.id,
        viewMode: user.role === 'management' ? 'management' : 'employee',
      }).returning();
    }

    const { passwordHash, ...userSafe } = user;
    return res.json({ user: userSafe, settings });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings (viewMode, customShortcut)
router.put('/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { viewMode, customShortcut } = req.body;

    const [updated] = await db.insert(userSettings)
      .values({
        userId: user.id,
        viewMode: viewMode || (user.role === 'management' ? 'management' : 'employee'),
        customShortcut: customShortcut ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          viewMode: viewMode !== undefined ? viewMode : undefined,
          customShortcut: customShortcut !== undefined ? customShortcut : undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error('Settings update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
