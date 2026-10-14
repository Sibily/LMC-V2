export interface User {
  id: string;
  name: string;
  email: string;
  role: 'management' | 'employee';
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface UserSettings {
  id?: string;
  userId: string;
  viewMode: 'management' | 'employee';
  customShortcut?: any;
}

export interface PipelineStage {
  id: string;
  name: string;
  type?: 'stage' | 'decision';
  yes?: string;
  no?: string;
  res?: 'yes' | 'no' | string;
  color?: string;
}

export interface ServiceHistoryItem {
  id: string;
  serviceId: string;
  stageName: string;
  note: string;
  byUserId?: string;
  byUser?: { id: string; name: string };
  atDate: string;
  nextAction: string;
  assignUserId?: string;
  assignedUser?: { id: string; name: string };
  followUpDate: string;
  followUpTime: string;
  createdAt?: string;
}

export interface Service {
  id: string;
  clientId: string;
  name: string;
  curStageId: string;
  respUserId?: string | null;
  responsibleUser?: { id: string; name: string; email?: string } | null;
  nextAction: string;
  updDate: string;
  stagesConfig: PipelineStage[];
  history?: ServiceHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientMember {
  id: string;
  clientId: string;
  userId: string;
  permission: 'Viewer' | 'Editor';
  user?: { id: string; name: string; email?: string; avatarUrl?: string | null };
}

export interface Client {
  id: string;
  type: 'Individual' | 'Company';
  name: string;
  company: string;
  phone: string;
  email: string;
  loc: string;
  source: string;
  status: 'Active Client' | 'Inactive Client' | 'On Hold' | 'Lost Client';
  ownerId?: string | null;
  owner?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  members?: ClientMember[];
  services?: Service[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  whoUserId?: string | null;
  whoUser?: { id: string; name: string; avatarUrl?: string | null } | null;
  byUserId?: string | null;
  byUser?: { id: string; name: string } | null;
  clientId?: string | null;
  client?: { id: string; name: string; company?: string } | null;
  serviceId?: string | null;
  service?: { id: string; name: string } | null;
  type: 'Call' | 'Proposal' | 'Reminder' | 'Follow-up' | 'Documents' | 'Update' | 'Personal' | 'Task';
  stageName: string;
  note: string;
  done: boolean;
  doneAt?: string | null;
  doneTime?: string | null;
  doneNote?: string | null;
  createdAt?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  byUserId: string;
  byUser?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Communication {
  id: string;
  clientId: string;
  type: string;
  byUserId: string;
  byUser?: { id: string; name: string; avatarUrl?: string | null };
  withUserIds: string[];
  date: string;
  time: string;
  details: string;
  followDate: string;
  followTime: string;
  followType: string;
  taskId?: string | null;
  task?: Task | null;
  loggedAt: string;
  source: string;
  createdAt?: string;
}

export interface Report {
  id: string;
  userId: string;
  user?: { id: string; name: string; avatarUrl?: string | null };
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  periodKey: string;
  note: string;
  submittedAt: string;
  status?: 'submitted' | 'approved';
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  fromUserId: string;
  fromUser?: { id: string; name: string; avatarUrl?: string | null };
  text: string;
  kind: 'Message' | 'Task' | 'Reminder';
  isBroadcast: boolean;
  toUserId?: string | null;
  due?: string;
  seenAt?: string | null;
  seenByUserIds?: string[];
  attachments?: ChatAttachment[];
  createdAt: string;
}

export interface ChatSummary {
  id: string;
  name: string;
  type: 'announcement' | 'colleague' | 'group';
  pinned: boolean;
  targetUserId?: string;
  avatarUrl?: string | null;
  members?: { id: string; name: string; avatarUrl?: string | null }[];
  lastMessage?: ChatMessage | null;
}

export interface NotificationItem {
  id: string;
  category: 'task' | 'rem' | 'client' | 'msg' | 'report';
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  keyType: string;
  targetId?: string | null;
  byUserId?: string | null;
  toUserIds?: string[];
  isManagementOnly?: boolean;
  read: boolean;
  createdAt: string;
}
