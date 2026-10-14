import { db, pool } from './index.js';
import { sql } from 'drizzle-orm';

export async function resetDatabase() {
  console.log('🧹 Cleaning test data from database...');
  await db.execute(sql`
    TRUNCATE TABLE 
      chat_messages, 
      chat_group_members, 
      chat_groups, 
      notifications, 
      reports, 
      communications, 
      notes, 
      tasks, 
      service_history, 
      services, 
      client_members, 
      clients 
    CASCADE;
  `);
  console.log('✅ Clean complete. Retained default admin and corporate pipeline.');
}

if (process.argv[1]?.endsWith('clean.ts') || process.argv[1]?.endsWith('clean.js')) {
  resetDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Reset failed:', e);
      await pool.end();
      process.exit(1);
    });
}
