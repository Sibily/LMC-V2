import bcrypt from 'bcryptjs';
import { db, pool } from './index.js';
import { users, userSettings, defaultPipelines, clients, clientMembers, services, serviceHistory, tasks, notes, communications, reports, chatGroups, chatGroupMembers, chatMessages, notifications } from './schema.js';
import { eq } from 'drizzle-orm';

const DEFAULT_STAGES = [
  { id: 'st_1', name: 'Enquiry', type: 'stage', color: '#64748b' },
  { id: 'st_2', name: 'Contact / Follow-up', type: 'stage', color: '#0ea5e9' },
  { id: 'st_3', name: 'Proposal', type: 'stage', color: '#8b5cf6' },
  { id: 'st_4', name: 'Accepted / Rejected', type: 'decision', yes: 'Accepted', no: 'Rejected', color: '#16a34a' },
  { id: 'st_5', name: 'Converted', type: 'stage', color: '#14b8a6' },
  { id: 'st_6', name: 'Execution', type: 'stage', color: '#f59e0b' },
  { id: 'st_7', name: 'Invoice', type: 'stage', color: '#ec4899' },
  { id: 'st_8', name: 'Document Collection', type: 'stage', color: '#6366f1' },
  { id: 'st_9', name: 'Completed', type: 'stage', color: '#22c55e' },
  { id: 'st_10', name: 'Delivery', type: 'stage', color: '#0891b2' },
];

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // 1. Ensure Default Pipeline exists
  const existingPipeline = await db.select().from(defaultPipelines).where(eq(defaultPipelines.isDefault, true));
  if (existingPipeline.length === 0) {
    await db.insert(defaultPipelines).values({
      name: 'Default Corporate Pipeline',
      stagesConfig: DEFAULT_STAGES,
      isDefault: true,
    });
    console.log('✅ Default pipeline initialized.');
  }

  // 2. Ensure Default Super Admin exists
  const existingAdmin = await db.select().from(users).where(eq(users.email, 'mohamed@company.ae'));
  let adminId: string;
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const [admin] = await db.insert(users).values({
      name: 'Mohamed',
      email: 'mohamed@company.ae',
      passwordHash,
      role: 'management',
    }).returning();
    adminId = admin.id;

    await db.insert(userSettings).values({
      userId: adminId,
      viewMode: 'management',
      customShortcut: null,
    });
    console.log('✅ Default admin user created: Mohamed (mohamed@company.ae / password123)');
  } else {
    adminId = existingAdmin[0].id;
    console.log('ℹ️ Admin user Mohamed already exists.');
  }

  // Check if --demo flag passed
  const isDemo = process.argv.includes('--demo');
  if (isDemo) {
    console.log('📦 Loading prototype demo dataset...');
    const pwHash = await bcrypt.hash('password123', 10);

    // Create Sarah & Omar
    let sarah = (await db.select().from(users).where(eq(users.email, 'sarah@company.ae')))[0];
    if (!sarah) {
      [sarah] = await db.insert(users).values({
        name: 'Sarah',
        email: 'sarah@company.ae',
        passwordHash: pwHash,
        role: 'employee',
      }).returning();
      await db.insert(userSettings).values({ userId: sarah.id, viewMode: 'employee' });
    }

    let omar = (await db.select().from(users).where(eq(users.email, 'omar@company.ae')))[0];
    if (!omar) {
      [omar] = await db.insert(users).values({
        name: 'Omar',
        email: 'omar@company.ae',
        passwordHash: pwHash,
        role: 'employee',
      }).returning();
      await db.insert(userSettings).values({ userId: omar.id, viewMode: 'employee' });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Demo Clients
    const existingClients = await db.select().from(clients);
    if (existingClients.length === 0) {
      const [ahmed] = await db.insert(clients).values({
        type: 'Individual',
        name: 'Ahmed Saeed',
        company: 'Saeed Trading LLC',
        phone: '+971501234567',
        email: 'ahmed@saeed.ae',
        loc: 'Dubai',
        source: 'Referral',
        status: 'Active Client',
        ownerId: adminId,
      }).returning();

      await db.insert(clientMembers).values({
        clientId: ahmed.id,
        userId: sarah.id,
        permission: 'Editor',
      });

      const [fatima] = await db.insert(clients).values({
        type: 'Company',
        name: 'Fatima Al Mansoori',
        company: 'Mansoori Consulting',
        phone: '+971559876543',
        email: 'fatima@mansoori.ae',
        loc: 'Abu Dhabi',
        source: 'Website',
        status: 'Active Client',
        ownerId: adminId,
      }).returning();

      const [noor] = await db.insert(clients).values({
        type: 'Individual',
        name: 'Noor Hassan',
        company: '',
        phone: '+971521112233',
        email: 'noor@mail.com',
        loc: 'Sharjah',
        source: 'Instagram',
        status: 'On Hold',
        ownerId: sarah.id,
      }).returning();

      // Services for Ahmed
      const [bizSetup] = await db.insert(services).values({
        clientId: ahmed.id,
        name: 'Business Setup',
        curStageId: 'st_9',
        respUserId: adminId,
        nextAction: 'Collect final licence',
        updDate: today,
        stagesConfig: DEFAULT_STAGES,
      }).returning();

      await db.insert(serviceHistory).values({
        serviceId: bizSetup.id,
        stageName: 'Completed',
        note: 'Initial setup completed.',
        byUserId: adminId,
        atDate: today + ' 09:00',
        nextAction: 'Collect final licence',
        assignUserId: adminId,
        followUpDate: today,
        followUpTime: '15:00',
      });

      // Tasks
      await db.insert(tasks).values([
        {
          title: 'Call Ahmed Saeed',
          desc: 'Discuss tax registration documents',
          date: today,
          time: '10:30',
          whoUserId: adminId,
          byUserId: adminId,
          clientId: ahmed.id,
          serviceId: bizSetup.id,
          type: 'Call',
          stageName: 'Completed',
          note: 'Discuss tax registration documents',
          done: false,
        },
        {
          title: 'Follow up Fatima',
          desc: 'Brochure feedback',
          date: today,
          time: '11:00',
          whoUserId: adminId,
          byUserId: adminId,
          clientId: fatima.id,
          type: 'Follow-up',
          stageName: 'Enquiry',
          note: 'Brochure feedback',
          done: false,
        },
      ]);

      // Notes
      await db.insert(notes).values([
        {
          title: 'Client preferences',
          body: 'Ahmed prefers WhatsApp over calls and replies after 6 PM.',
          clientId: ahmed.id,
          byUserId: adminId,
        },
        {
          title: 'Ideas for the week',
          body: 'Prepare a simple proposal template for trademark clients.',
          byUserId: adminId,
        },
      ]);

      console.log('✅ Demo dataset loaded successfully.');
    }
  }

  console.log('✨ Seed finished.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Seed error:', err);
      process.exit(1);
    })
    .finally(() => pool.end());
}
