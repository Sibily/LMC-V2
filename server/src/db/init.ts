import { pool } from './index.js';
import { seedDatabase } from './seed.js';

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // 1. Create all application tables automatically if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        view_mode TEXT NOT NULL DEFAULT 'employee',
        custom_shortcut JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL DEFAULT 'Individual',
        name TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        loc TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Active Client',
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission TEXT NOT NULL DEFAULT 'Viewer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        cur_stage_id TEXT NOT NULL,
        resp_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        next_action TEXT NOT NULL DEFAULT '',
        upd_date TEXT NOT NULL DEFAULT '',
        stages_config JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS service_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        stage_name TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        at_date TEXT NOT NULL,
        next_action TEXT NOT NULL DEFAULT '',
        assign_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        follow_up_date TEXT NOT NULL DEFAULT '',
        follow_up_time TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS default_pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL DEFAULT 'Default Pipeline',
        stages_config JSONB NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        "desc" TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        time TEXT NOT NULL DEFAULT '09:00',
        who_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        type TEXT NOT NULL DEFAULT 'Task',
        stage_name TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        done BOOLEAN NOT NULL DEFAULT false,
        done_at TEXT,
        done_time TEXT,
        done_note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL DEFAULT 'Note',
        body TEXT NOT NULL DEFAULT '',
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS communications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        with_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        date TEXT NOT NULL,
        time TEXT NOT NULL DEFAULT '',
        details TEXT NOT NULL DEFAULT '',
        follow_date TEXT NOT NULL DEFAULT '',
        follow_time TEXT NOT NULL DEFAULT '',
        follow_type TEXT NOT NULL DEFAULT '',
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        source TEXT NOT NULL DEFAULT 'Manual',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        frequency TEXT NOT NULL,
        period_key TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        acknowledged_at TEXT,
        acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id TEXT NOT NULL,
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'Message',
        is_broadcast BOOLEAN NOT NULL DEFAULT false,
        to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        due TEXT NOT NULL DEFAULT '',
        seen_at TIMESTAMP WITH TIME ZONE,
        seen_by_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        key_type TEXT NOT NULL DEFAULT 'home',
        target_id TEXT,
        by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        to_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        read_by_user_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
        cleared_by_user_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_management_only BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ PostgreSQL schema verified/initialized.');

    // 2. Ensure initial seed (Nujoom management user & default pipeline)
    await seedDatabase();
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  } finally {
    client.release();
  }
}
