import { pgTable, text, timestamp, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Users & Profiles ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('employee'), // 'management' | 'employee'
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  viewMode: text('view_mode').default('employee').notNull(), // 'management' | 'employee'
  customShortcut: jsonb('custom_shortcut'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Clients & Client Members ---
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').default('Individual').notNull(), // 'Individual' | 'Company'
  name: text('name').notNull(),
  company: text('company').default('').notNull(),
  phone: text('phone').default('').notNull(),
  email: text('email').default('').notNull(),
  loc: text('loc').default('').notNull(),
  source: text('source').default('').notNull(),
  referrer: text('referrer').default('').notNull(),
  status: text('status').default('Active Client').notNull(), // 'Active Client' | 'Inactive Client' | 'On Hold' | 'Lost Client'
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const clientMembers = pgTable('client_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  permission: text('permission').default('Viewer').notNull(), // 'Viewer' | 'Editor'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Services & Pipelines ---
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  curStageId: text('cur_stage_id').notNull(),
  respUserId: uuid('resp_user_id').references(() => users.id, { onDelete: 'set null' }),
  nextAction: text('next_action').default('').notNull(),
  updDate: text('upd_date').default('').notNull(),
  stagesConfig: jsonb('stages_config').notNull(), // Array of { id, name, type, yes, no, res, color }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const serviceHistory = pgTable('service_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  stageName: text('stage_name').notNull(),
  note: text('note').default('').notNull(),
  byUserId: uuid('by_user_id').references(() => users.id, { onDelete: 'set null' }),
  atDate: text('at_date').notNull(),
  nextAction: text('next_action').default('').notNull(),
  assignUserId: uuid('assign_user_id').references(() => users.id, { onDelete: 'set null' }),
  followUpDate: text('follow_up_date').default('').notNull(),
  followUpTime: text('follow_up_time').default('').notNull(),
  acts: jsonb('acts').default([]).notNull(), // Array of { id, kind, title, body, who, date, time, tid }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const defaultPipelines = pgTable('default_pipelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').default('Default Pipeline').notNull(),
  stagesConfig: jsonb('stages_config').notNull(),
  isDefault: boolean('is_default').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Client Documents & Invoices ---
export const clientDocuments = pgTable('client_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  type: text('type').default('Other').notNull(), // 'Passport' | 'Emirates ID' | 'Visa' | 'Trade licence' | 'Contract' | 'Invoice / receipt' | 'Photo' | 'Other'
  customType: text('custom_type'),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
  note: text('note').default('').notNull(),
  fileName: text('file_name'),
  fileSize: text('file_size').default('0'),
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const clientInvoices = pgTable('client_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  invoiceNo: text('invoice_no').notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
  description: text('description').default('').notNull(),
  amount: text('amount').default('0').notNull(),
  vatApplicable: boolean('vat_applicable').default(true).notNull(),
  vatAmount: text('vat_amount').default('0').notNull(),
  totalAmount: text('total_amount').default('0').notNull(),
  issuedDate: text('issued_date').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').default('Draft').notNull(), // 'Draft' | 'Sent' | 'Paid' | 'Overdue'
  note: text('note').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const serviceCatalog = pgTable('service_catalog', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  category: text('category').default('Legal').notNull(),
  isPreset: boolean('is_preset').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Tasks & Reminders ---
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  desc: text('desc').default('').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').default('09:00').notNull(), // HH:MM
  whoUserId: uuid('who_user_id').references(() => users.id, { onDelete: 'set null' }),
  byUserId: uuid('by_user_id').references(() => users.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
  type: text('type').default('Task').notNull(), // 'Call' | 'Proposal' | 'Reminder' | 'Follow-up' | 'Documents' | 'Update' | 'Personal' | 'Task'
  stageName: text('stage_name').default('').notNull(),
  note: text('note').default('').notNull(),
  done: boolean('done').default(false).notNull(),
  doneAt: text('done_at'),
  doneTime: text('done_time'),
  doneNote: text('done_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Notes ---
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').default('Note').notNull(),
  body: text('body').default('').notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  byUserId: uuid('by_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Communications ---
export const communications = pgTable('communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'WhatsApp message' | 'Email' | 'Phone call' | 'Meeting' | 'Internal note' | 'Other'
  byUserId: uuid('by_user_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  withUserIds: jsonb('with_user_ids').default([]).notNull(), // Array of user names/IDs
  date: text('date').notNull(),
  time: text('time').default('').notNull(),
  details: text('details').default('').notNull(),
  followDate: text('follow_date').default('').notNull(),
  followTime: text('follow_time').default('').notNull(),
  followType: text('follow_type').default('').notNull(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
  source: text('source').default('Manual').notNull(), // 'Manual' | 'Demo'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Work Reports ---
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  frequency: text('frequency').notNull(), // 'Daily' | 'Weekly' | 'Monthly'
  periodKey: text('period_key').notNull(), // e.g. '2026-10-13', '2026-W41', '2026-10'
  note: text('note').default('').notNull(),
  submittedAt: text('submitted_at').notNull(),
  status: text('status').default('submitted').notNull(), // 'submitted' | 'approved'
  acknowledgedAt: text('acknowledged_at'),
  acknowledgedBy: uuid('acknowledged_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Real-time Chats & Groups ---
export const chatGroups = pgTable('chat_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatGroupMembers = pgTable('chat_group_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id').references(() => chatGroups.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: text('chat_id').notNull(), // 'announcement', 'dm:uuid1|uuid2', or 'group:uuid'
  fromUserId: uuid('from_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  kind: text('kind').default('Message').notNull(), // 'Message' | 'Task' | 'Reminder'
  isBroadcast: boolean('is_broadcast').default(false).notNull(),
  toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'set null' }),
  due: text('due').default('').notNull(),
  seenAt: timestamp('seen_at'),
  seenByUserIds: jsonb('seen_by_user_ids').$type<string[]>().default([]).notNull(),
  attachments: jsonb('attachments').$type<{ url: string; name: string; type: string; size?: number }[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Notifications ---
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: text('category').notNull(), // 'task' | 'rem' | 'client' | 'msg' | 'report'
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').default('').notNull(),
  keyType: text('key_type').default('home').notNull(), // 'task' | 'chat' | 'client' | 'emp' | 'rem'
  targetId: text('target_id'),
  byUserId: uuid('by_user_id').references(() => users.id, { onDelete: 'set null' }),
  toUserIds: jsonb('to_user_ids').default([]).notNull(), // array of user IDs
  readByUserIds: jsonb('read_by_user_ids').default({}).notNull(), // { [userId]: true }
  clearedByUserIds: jsonb('cleared_by_user_ids').default({}).notNull(), // { [userId]: true }
  isManagementOnly: boolean('is_management_only').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Relations ---
export const usersRelations = relations(users, ({ many, one }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  ownedClients: many(clients),
  clientMemberships: many(clientMembers),
  assignedTasks: many(tasks, { relationName: 'assignedTo' }),
  createdTasks: many(tasks, { relationName: 'createdBy' }),
  notes: many(notes),
  reports: many(reports),
  chatMessages: many(chatMessages),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  owner: one(users, {
    fields: [clients.ownerId],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [clients.deletedBy],
    references: [users.id],
  }),
  members: many(clientMembers),
  services: many(services),
  tasks: many(tasks),
  notes: many(notes),
  communications: many(communications),
  documents: many(clientDocuments),
  invoices: many(clientInvoices),
}));

export const clientDocumentsRelations = relations(clientDocuments, ({ one }) => ({
  client: one(clients, {
    fields: [clientDocuments.clientId],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [clientDocuments.serviceId],
    references: [services.id],
  }),
}));

export const clientInvoicesRelations = relations(clientInvoices, ({ one }) => ({
  client: one(clients, {
    fields: [clientInvoices.clientId],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [clientInvoices.serviceId],
    references: [services.id],
  }),
}));

export const clientMembersRelations = relations(clientMembers, ({ one }) => ({
  client: one(clients, {
    fields: [clientMembers.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientMembers.userId],
    references: [users.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  client: one(clients, {
    fields: [services.clientId],
    references: [clients.id],
  }),
  responsibleUser: one(users, {
    fields: [services.respUserId],
    references: [users.id],
  }),
  history: many(serviceHistory),
  tasks: many(tasks),
}));

export const serviceHistoryRelations = relations(serviceHistory, ({ one }) => ({
  service: one(services, {
    fields: [serviceHistory.serviceId],
    references: [services.id],
  }),
  byUser: one(users, {
    fields: [serviceHistory.byUserId],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [serviceHistory.assignUserId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  whoUser: one(users, {
    fields: [tasks.whoUserId],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  byUser: one(users, {
    fields: [tasks.byUserId],
    references: [users.id],
    relationName: 'createdBy',
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [tasks.serviceId],
    references: [services.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  client: one(clients, {
    fields: [notes.clientId],
    references: [clients.id],
  }),
  byUser: one(users, {
    fields: [notes.byUserId],
    references: [users.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  client: one(clients, {
    fields: [communications.clientId],
    references: [clients.id],
  }),
  byUser: one(users, {
    fields: [communications.byUserId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [communications.taskId],
    references: [tasks.id],
  }),
}));

export const chatGroupsRelations = relations(chatGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [chatGroups.createdBy],
    references: [users.id],
  }),
  members: many(chatGroupMembers),
}));

export const chatGroupMembersRelations = relations(chatGroupMembers, ({ one }) => ({
  group: one(chatGroups, {
    fields: [chatGroupMembers.groupId],
    references: [chatGroups.id],
  }),
  user: one(users, {
    fields: [chatGroupMembers.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  fromUser: one(users, {
    fields: [chatMessages.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [chatMessages.toUserId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
}));
