import React, { useState, useEffect, useRef, useMemo } from 'react';
import { V, R, P, B, IB, Av, Logo, F, inp, card, G, MU, BD, TODAY, fmt, t12, Modal } from './components/Common';
import { I } from './components/Icons';
import { useAuth } from './context/AuthContext';
import { api } from './api/client';
import { getSocket } from './socket';
import { Client, Task, Note, NotificationItem } from './types';

// Pages
import { Home } from './pages/Home';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Inbox } from './pages/Inbox';
import { TasksPage } from './pages/Tasks';
import { RemindersPage } from './pages/Reminders';
import { NotesPage } from './pages/Notes';
import { ReportsPage } from './pages/Reports';
import { TeamPage } from './pages/Team';
import { SettingsPage } from './pages/Settings';
import { EmpProfilePage } from './pages/EmpProfile';

// Modals
import { ClientForm, TaskForm, SvcForm, StageForm, DecideForm } from './components/Modals';
import { PeopleModal, CustPipelineModal, NoteForm, CommunicationForm, EmpModal, MenuModal, PipelineOverviewModal } from './components/Modals/extraModals';
import { DocFormModal } from './components/Modals/DocFormModal';
import { InvoiceFormModal } from './components/Modals/InvoiceFormModal';
import { DeleteClientConfirmModal, DeletedClientProfileModal, PermanentDeleteConfirmModal } from './components/Modals/ClientDeleteModals';
import { ActLogModal } from './components/Modals/ActLogModal';
import { CredFormModal } from './components/Modals/CredFormModal';
import { ReminderFormModal } from './components/Modals/ReminderFormModal';

// Routing Helpers for Hash-based deep linking
function parseHash(): { page: string; id?: string; params?: any } {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash) return { page: 'home' };
  const [path, queryString] = hash.split('?');
  const segments = path.split('/');
  const page = segments[0] || 'home';
  const rawId = segments.slice(1).join('/');
  const id = rawId ? decodeURIComponent(rawId) : undefined;
  const params: Record<string, any> = {};
  if (queryString) {
    const sp = new URLSearchParams(queryString);
    sp.forEach((v, k) => {
      params[k] = v;
    });
  }
  if (page === 'clients' && id) {
    return { page: 'clientDetail', id, params };
  }
  if (page === 'emp' && id) {
    return { page: 'emp', id, params };
  }
  return { page, id, params };
}

function getHashFromNav(n: { page: string; id?: string; params?: any }): string {
  if (n.page === 'clientDetail' && n.id) {
    return `#/clients/${n.id}`;
  }
  if (n.page === 'emp' && n.id) {
    return `#/emp/${encodeURIComponent(n.id)}`;
  }
  let h = `#/${n.page}`;
  if (n.id && n.page !== 'clientDetail' && n.page !== 'emp') {
    h += `/${encodeURIComponent(n.id)}`;
  }
  if (n.params && Object.keys(n.params).length) {
    const sp = new URLSearchParams(n.params);
    h += `?${sp.toString()}`;
  }
  return h;
}

export const App: React.FC = () => {
  const { user, settings, loading, login, toast, toastMsg, refreshUser } = useAuth();

  // App navigation state with Hash-based deep-link routing
  const [nav, setNavState] = useState<{ page: string; id?: string; params?: any }>(() => parseHash());

  const setNav = (newNav: { page: string; id?: string; params?: any }) => {
    setNavState(newNav);
    const targetHash = getHashFromNav(newNav);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      setNavState(parseHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.location.hash = '#/home';
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [activeModal, setActiveModal] = useState<{ type: string; data?: any } | null>(null);

  // App data state
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const pendingNotifKeysRef = useRef<Set<string>>(new Set());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'task' | 'rem' | 'client' | 'msg' | 'report'>('all');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const wide = windowWidth >= 900;
  const isMgmt = user?.role === 'management' && settings?.viewMode === 'management';

  // Visible notifications dynamically filtered by active view mode and recipient rules
  const visibleNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter((n) => {
      const isSystemAlert = n.keyType === 'digest' || n.keyType === 'task_due' || n.keyType === 'task_overdue';

      // 1. Suppress own self-actions (notifications for actions the user performed themselves)
      if (!isSystemAlert && n.byUserId && n.byUserId === user.id) {
        return false;
      }

      // 2. In employee mode, hide management-only notifications
      if (!isMgmt) {
        if (n.isManagementOnly) return false;
        const to = (n.toUserIds as string[]) || [];
        if (isSystemAlert) {
          if (to.length > 0 && !to.includes(user.id)) return false;
        } else {
          // Actions by others: must be targeted to this user (e.g. direct message, task assignment, approved report)
          if (!to.includes(user.id)) return false;
        }
      } else {
        // Management mode:
        const to = (n.toUserIds as string[]) || [];
        if (to.length > 0 && !to.includes(user.id) && !n.isManagementOnly) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, user, isMgmt]);

  const unreadNotifs = useMemo(() => visibleNotifications.filter((n) => !n.read), [visibleNotifications]);

  // Responsive resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Cmd+K / Ctrl+K Shortcut for In-Bar Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (wide) {
          desktopSearchRef.current?.focus();
          desktopSearchRef.current?.select();
          setSearchFocused(true);
        } else {
          setMobileSearchOpen((prev) => {
            const next = !prev;
            if (next) {
              setTimeout(() => mobileSearchRef.current?.focus(), 60);
            }
            return next;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wide]);

  interface SearchResultItem {
    category: 'client' | 'task' | 'team' | 'note';
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: [string, string];
    icon?: string;
    avatarName?: string;
    action: () => void;
  }

  // Live search query & items for clients, tasks, team, and notes
  const searchQ = searchText.trim().toLowerCase();

  const searchItems: SearchResultItem[] = useMemo(() => {
    if (!searchQ) return [];

    // In Employee mode, only clients owned by user or where user is a member
    const scopedClients = isMgmt
      ? clients
      : clients.filter((c) => c.ownerId === user?.id || (c.members || []).some((m) => m.userId === user?.id));

    const matchClients = scopedClients.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQ) ||
        (c.company && c.company.toLowerCase().includes(searchQ)) ||
        (c.phone && c.phone.includes(searchQ)) ||
        (c.email && c.email.toLowerCase().includes(searchQ)) ||
        (c.loc && c.loc.toLowerCase().includes(searchQ))
    );

    // In Employee mode, only user's own tasks and reminders
    const scopedTasks = isMgmt
      ? tasks
      : tasks.filter((t) => t.whoUserId === user?.id);

    const matchTasks = scopedTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(searchQ) ||
        (t.desc && t.desc.toLowerCase().includes(searchQ)) ||
        (t.client?.name && t.client.name.toLowerCase().includes(searchQ))
    );

    // Team search: ONLY available in Management mode
    const matchTeam = isMgmt
      ? team.filter(
          (u) =>
            u.name.toLowerCase().includes(searchQ) ||
            (u.email && u.email.toLowerCase().includes(searchQ)) ||
            (u.role && u.role.toLowerCase().includes(searchQ))
        )
      : [];

    // In Employee mode, only notes created by user or on their scoped clients
    const scopedNotes = isMgmt
      ? notes
      : notes.filter((n) => n.byUserId === user?.id || scopedClients.some((c) => c.id === n.clientId));

    const matchNotes = scopedNotes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(searchQ)) ||
        (n.body && n.body.toLowerCase().includes(searchQ)) ||
        (n.client?.name && n.client.name.toLowerCase().includes(searchQ))
    );

    return [
      ...matchClients.map((c) => ({
        category: 'client' as const,
        id: 'client_' + c.id,
        title: c.name,
        subtitle: [c.company || c.type, c.loc, c.phone].filter(Boolean).join(' · '),
        badge: 'CLIENT',
        badgeColor: ['#dbeafe', '#1e40af'] as [string, string],
        avatarName: c.name,
        action: () => {
          setSearchFocused(false);
          setMobileSearchOpen(false);
          setSearchText('');
          setNav({ page: 'clientDetail', id: c.id });
        },
      })),
      ...matchTasks.map((t) => ({
        category: 'task' as const,
        id: 'task_' + t.id,
        title: t.title,
        subtitle: [t.client?.name || 'Personal', fmt(t.date), t.type].filter(Boolean).join(' · '),
        badge: t.type === 'Reminder' ? 'REMINDER' : 'TASK',
        badgeColor: (t.type === 'Reminder' ? ['#fce7f3', '#9d174d'] : ['#fef3c7', '#92400e']) as [string, string],
        icon: t.type === 'Reminder' ? 'bell' : 'task',
        action: () => {
          setSearchFocused(false);
          setMobileSearchOpen(false);
          setSearchText('');
          setActiveModal({ type: 'taskView', data: t });
        },
      })),
      ...matchTeam.map((u) => ({
        category: 'team' as const,
        id: 'team_' + u.id,
        title: u.name,
        subtitle: [u.email, u.role === 'management' ? 'Management' : 'Employee'].filter(Boolean).join(' · '),
        badge: 'TEAM',
        badgeColor: ['#ede9fe', '#5b21b6'] as [string, string],
        avatarName: u.name,
        action: () => {
          setSearchFocused(false);
          setMobileSearchOpen(false);
          setSearchText('');
          setNav({ page: 'emp', id: u.id });
        },
      })),
      ...matchNotes.map((n) => ({
        category: 'note' as const,
        id: 'note_' + n.id,
        title: n.title || 'Note',
        subtitle: [n.client?.name || 'Personal', (n.body || '').slice(0, 45)].filter(Boolean).join(' · '),
        badge: 'NOTE',
        badgeColor: ['#e0f2fe', '#0369a1'] as [string, string],
        icon: 'note',
        action: () => {
          setSearchFocused(false);
          setMobileSearchOpen(false);
          setSearchText('');
          setActiveModal({ type: 'note', data: n });
        },
      })),
    ];
  }, [searchQ, clients, tasks, team, notes, isMgmt, user?.id]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchItems.length > 0) {
        setSelectedSearchIndex((prev) => (prev + 1) % searchItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchItems.length > 0) {
        setSelectedSearchIndex((prev) => (prev - 1 + searchItems.length) % searchItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchItems.length > 0 && searchItems[selectedSearchIndex]) {
        searchItems[selectedSearchIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchText('');
      setSearchFocused(false);
      setMobileSearchOpen(false);
      desktopSearchRef.current?.blur();
      mobileSearchRef.current?.blur();
    }
  };

  // Data fetcher
  const loadAllData = async () => {
    if (!user) return;
    try {
      const [cls, tks, nts, tm, notifs] = await Promise.all([
        api.clients.list(),
        api.tasks.list(),
        api.notes.list(),
        api.users.list(),
        api.notifs.list({ viewMode: settings?.viewMode }),
      ]);
      setClients(cls);
      setTasks(tks);
      setNotes(nts);
      setTeam(tm);
      setNotifications(notifs);
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      loadAllData();
      const socket = getSocket();

      const handleNotification = (notif: NotificationItem) => {
        const isSystemAlert = notif.keyType === 'digest' || notif.keyType === 'task_due' || notif.keyType === 'task_overdue';

        // Suppress own self-action notifications
        if (!isSystemAlert && notif.byUserId && notif.byUserId === user.id) {
          return;
        }

        // Check view mode filtering for real-time notifications
        if (!isMgmt) {
          if (notif.isManagementOnly) return;
          const to = notif.toUserIds || [];
          if (!isSystemAlert && !to.includes(user.id)) return;
          if (isSystemAlert && to.length > 0 && !to.includes(user.id)) return;
        }

        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
        if (notif.keyType !== 'task_due' && notif.keyType !== 'task_overdue' && notif.keyType !== 'digest') {
          toast(notif.title);
        }
      };

      const handleDataMutation = () => {
        loadAllData();
      };

      socket.on('new_notification', handleNotification);
      socket.on('data_mutation', handleDataMutation);

      return () => {
        socket.off('new_notification', handleNotification);
        socket.off('data_mutation', handleDataMutation);
      };
    }
  }, [user, isMgmt, settings?.viewMode]);

  // 3-Tier Notification Lifecycle (Login Digest, Due Now, 30m Overdue Follow-up)
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const checkAndDispatchNotifs = async () => {
      const now = new Date();
      const nowHM = now.toTimeString().slice(0, 5); // "HH:MM"
      const todayISO = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const [curH, curM] = nowHM.split(':').map(Number);
      const currentMinutes = curH * 60 + curM;

      // Tier 1: Daily Login / Session Start Agenda Digest
      const digestKey = `digest_${todayISO}`;
      const hasDigestToday = notifications.some(
        (n) => n.keyType === 'digest' && n.createdAt && n.createdAt.slice(0, 10) === todayISO
      );
      if (!hasDigestToday && !pendingNotifKeysRef.current.has(digestKey)) {
        const todayItems = tasks.filter(
          (t) => t.whoUserId === user.id && !t.done && t.date === todayISO
        );
        if (todayItems.length > 0) {
          pendingNotifKeysRef.current.add(digestKey);
          const remCount = todayItems.filter((t) => t.type === 'Reminder').length;
          const taskCount = todayItems.length - remCount;
          const parts: string[] = [];
          if (taskCount > 0) parts.push(`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`);
          if (remCount > 0) parts.push(`${remCount} ${remCount === 1 ? 'reminder' : 'reminders'}`);
          const summary = `You have ${parts.join(' and ')} scheduled for today.`;

          try {
            await api.notifs.create({
              category: 'task',
              icon: 'task',
              color: '#10b981',
              title: "📅 Today's Agenda",
              subtitle: summary,
              keyType: 'digest',
              targetId: null,
            });
            if (window.Notification && Notification.permission === 'granted') {
              new Notification("buzzrdesk - Today's Agenda", { body: summary });
            }
          } catch (e) {
            pendingNotifKeysRef.current.delete(digestKey);
          }
        }
      }

      // Filter today's tasks for current user
      const userTodayTasks = tasks.filter(
        (t) => t.whoUserId === user.id && !t.done && t.date === todayISO
      );

      for (const t of userTodayTasks) {
        if (!t.time) continue;
        const [tH, tM] = t.time.split(':').map(Number);
        const taskMinutes = tH * 60 + tM;
        const isRem = t.type === 'Reminder';

        // Tier 2: Task Due Now Alert
        const dueKey = `due_${t.id}`;
        const hasDueNotif = notifications.some(
          (n) => n.keyType === 'task_due' && n.targetId === t.id
        );
        if (currentMinutes >= taskMinutes && !hasDueNotif && !pendingNotifKeysRef.current.has(dueKey)) {
          pendingNotifKeysRef.current.add(dueKey);
          try {
            await api.notifs.create({
              category: isRem ? 'rem' : 'task',
              icon: isRem ? 'bell' : 'clock',
              color: isRem ? '#db2777' : '#f59e0b',
              title: `⏰ Due now: ${t.title}`,
              subtitle: `${isRem ? 'Reminder' : 'Task'} scheduled for ${t.time}`,
              keyType: 'task_due',
              targetId: t.id,
            });
            if (window.Notification && Notification.permission === 'granted') {
              new Notification(`Due now: ${t.title}`, { body: `Scheduled for ${t.time}` });
            }
          } catch (e) {
            pendingNotifKeysRef.current.delete(dueKey);
          }
        }

        // Tier 3: Unattended / Overdue Task Alert (30 minutes after due time)
        const overdueKey = `overdue_${t.id}`;
        const hasOverdueNotif = notifications.some(
          (n) => n.keyType === 'task_overdue' && n.targetId === t.id
        );
        if (
          currentMinutes >= taskMinutes + 30 &&
          !hasOverdueNotif &&
          !pendingNotifKeysRef.current.has(overdueKey)
        ) {
          pendingNotifKeysRef.current.add(overdueKey);
          try {
            await api.notifs.create({
              category: isRem ? 'rem' : 'task',
              icon: isRem ? 'bell' : 'alert',
              color: '#ef4444',
              title: `⚠️ Unattended: ${t.title}`,
              subtitle: `30+ mins overdue (${t.time}). Tap to view, reschedule, or complete.`,
              keyType: 'task_overdue',
              targetId: t.id,
            });
            if (window.Notification && Notification.permission === 'granted') {
              new Notification(`Unattended: ${t.title}`, {
                body: `30+ mins overdue (${t.time}). Tap to view or complete.`,
              });
            }
          } catch (e) {
            pendingNotifKeysRef.current.delete(overdueKey);
          }
        }
      }
    };

    checkAndDispatchNotifs();
    const interval = setInterval(checkAndDispatchNotifs, 20000);
    return () => clearInterval(interval);
  }, [user, tasks, notifications]);

  // Unified click handler for notification items
  const handleNotificationClick = async (n: NotificationItem) => {
    await api.notifs.markRead(n.id);
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    setNotificationsOpen(false);

    if (n.keyType === 'client' && n.targetId) {
      setNav({ page: 'clientDetail', id: n.targetId });
    } else if (n.keyType === 'chat') {
      setNav({ page: 'inbox', id: n.targetId || undefined });
    } else if (
      (n.keyType === 'task_due' || n.keyType === 'task_overdue' || n.keyType === 'task') &&
      n.targetId
    ) {
      const targetTask = tasks.find((t) => t.id === n.targetId);
      if (targetTask) {
        setActiveModal({ type: 'taskView', data: targetTask });
      } else {
        setNav({ page: n.category === 'rem' ? 'reminders' : 'tasks' });
      }
    } else if (n.keyType === 'digest' || n.keyType === 'task') {
      setNav({ page: 'tasks' });
    }
  };


  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast('Signed in successfully');
    } catch (err: any) {
      toast(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Splash Screen
  if (loading) {
    return (
      <V style={{ height: '100vh', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Logo s={46} />
        <span style={{ color: MU, fontSize: 14 }}>Loading buzzrdesk…</span>
      </V>
    );
  }

  // Login Page
  if (!user) {
    return (
      <V style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <V style={{ ...card, maxWidth: 380, width: '100%', gap: 16, padding: 28 }}>
          <Logo s={42} />
          <V style={{ gap: 4 }}>
            <b style={{ fontSize: 18 }}>Welcome to buzzrdesk</b>
            <span style={{ fontSize: 13, color: MU }}>Sign in with your corporate credentials</span>
          </V>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <V style={{ gap: 4 }}>
              <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>Email</span>
              <input
                type="email"
                required
                style={inp}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@company.ae"
              />
            </V>

            <V style={{ gap: 4 }}>
              <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>Password</span>
              <input
                type="password"
                required
                style={inp}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </V>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                background: G,
                color: '#fff',
                border: 0,
                borderRadius: 12,
                padding: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              {loginLoading ? 'Signing in…' : 'Log in'}
            </button>
          </form>
        </V>
      </V>
    );
  }

  // Navigation Items
  const NAV_ITEMS = isMgmt
    ? [
        ['home', 'Home', 'home'],
        ['clients', 'Clients', 'users'],
        ['inbox', 'Inbox', 'inbox'],
        ['team', 'All Employees', 'users'],
        ['tasks', 'All Tasks', 'task'],
        ['reminders', 'Reminders', 'bell'],
        ['reports', 'All Reports', 'report'],
        ['settings', 'Settings', 'cog'],
      ]
    : [
        ['home', 'Home', 'home'],
        ['clients', 'Clients', 'users'],
        ['inbox', 'Inbox', 'inbox'],
        ['tasks', 'My Tasks', 'task'],
        ['reminders', 'My Reminders', 'bell'],
        ['reports', 'My Reports', 'report'],
        ['settings', 'Settings', 'cog'],
      ];



  // Top Bar
  const topBar = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '10px 16px',
        minHeight: 68,
        background: '#fff',
        borderBottom: '1px solid ' + BD,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        paddingTop: 'calc(10px + env(safe-area-inset-top,0px))',
        boxSizing: 'border-box',
      }}
    >
      {wide ? (
        <div style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
          {/* Desktop Inline Search Bar in Top Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              height: 42,
              background: searchFocused ? '#ffffff' : '#f8fafc',
              border: searchFocused ? `1.5px solid ${G}` : '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: searchFocused ? '0 0 0 3px rgba(31, 203, 102, 0.14)' : 'none',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            <I n="search" s={16} style={{ color: searchFocused ? G : MU, flexShrink: 0 }} />
            <input
              ref={desktopSearchRef}
              type="text"
              placeholder="Search clients, tasks, team, notes…"
              value={searchText}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSelectedSearchIndex(0);
                if (!searchFocused) setSearchFocused(true);
              }}
              onKeyDown={handleSearchKeyDown}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                color: '#0f172a',
                flex: 1,
                minWidth: 0,
                padding: 0,
                fontFamily: 'inherit',
              }}
            />
            {searchText && (
              <IB
                n="x"
                s={16}
                onPress={() => {
                  setSearchText('');
                  setSelectedSearchIndex(0);
                  desktopSearchRef.current?.focus();
                }}
                style={{ width: 24, height: 24, borderRadius: 6 }}
              />
            )}
          </div>

          {/* Anchored Desktop Search Results Dropdown (appears only when user starts typing) */}
          {searchFocused && searchQ.length > 0 && (
            <>
              {/* Invisible click catcher overlay to dismiss on outside click */}
              <div
                onClick={() => setSearchFocused(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 45 }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '100%',
                  maxHeight: 420,
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.05)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'modalFadeIn 0.14s ease',
                }}
              >
                {/* Scrollable Items List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                  {searchItems.length > 0 ? (
                    <V style={{ gap: 2 }}>
                      {searchItems.map((item, idx) => {
                        const isSelected = idx === selectedSearchIndex;
                        return (
                          <P
                            key={item.id}
                            onMouseEnter={() => setSelectedSearchIndex(idx)}
                            onPress={item.action}
                            style={{
                              ...R,
                              gap: 10,
                              padding: '8px 10px',
                              borderRadius: 10,
                              background: isSelected ? '#f0fdf4' : 'transparent',
                              borderLeft: isSelected ? `3px solid ${G}` : '3px solid transparent',
                              transition: 'background 0.12s ease',
                              cursor: 'pointer',
                              alignItems: 'center',
                            }}
                          >
                            {item.avatarName ? (
                              <Av n={item.avatarName} s={28} />
                            ) : (
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  background: item.badgeColor[0],
                                  color: item.badgeColor[1],
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <I n={item.icon || 'task'} s={14} />
                              </div>
                            )}

                            <V style={{ flex: 1, minWidth: 0, gap: 1 }}>
                              <b style={{ fontSize: 13, color: isSelected ? '#15803d' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.title}
                              </b>
                              <span style={{ fontSize: 11, color: MU, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.subtitle}
                              </span>
                            </V>

                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 5,
                                background: item.badgeColor[0],
                                color: item.badgeColor[1],
                                flexShrink: 0,
                              }}
                            >
                              {item.badge}
                            </span>
                          </P>
                        );
                      })}
                    </V>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '28px 12px', color: MU, fontSize: 13 }}>
                      Nothing matches “{searchText}”.
                    </div>
                  )}
                </div>

                {/* Dropdown footer navigation hint */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: 11,
                    color: '#64748b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span><kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>↑</kbd> <kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>↓</kbd> navigate</span>
                    <span><kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>↵</kbd> select</span>
                  </div>
                  <span><kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>esc</kbd> close</span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Logo s={40} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', position: 'relative', zIndex: 1 }}>
        {!wide && (
          <IB
            n="search"
            s={25}
            onPress={() => {
              setMobileSearchOpen(true);
              setTimeout(() => mobileSearchRef.current?.focus(), 60);
            }}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              color: '#0b1b16',
            }}
          />
        )}

        <div style={{ position: 'relative', display: 'flex' }}>
          <IB
            n="bell"
            s={wide ? 22 : 25}
            onPress={() => setNotificationsOpen(!notificationsOpen)}
            style={{
              width: wide ? 42 : 46,
              height: wide ? 42 : 46,
              background: wide && notificationsOpen ? '#f1f5f9' : 'transparent',
              borderRadius: wide ? 12 : 23,
              color: '#0b1b16',
            }}
          />
          {unreadNotifs.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 3,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 9,
                background: '#dc2626',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {unreadNotifs.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Desktop Sidebar
  const sidebar = (
    <V
      style={{
        width: 220,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid ' + BD,
        padding: 14,
        justifyContent: 'space-between',
        height: '100vh',
        minHeight: '100vh',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
      }}
    >
      <V style={{ gap: 4 }}>
        <div style={{ marginBottom: 14 }}>
          <Logo />
        </div>
        {NAV_ITEMS.map(([k, l, ic]) => {
          const on = nav.page === k;
          const openReminders = tasks.filter((t) => t.type === 'Reminder' && !t.done && (isMgmt || t.whoUserId === user.id)).length;
          return (
            <P
              key={k}
              onPress={() => setNav({ page: k })}
              style={{
                ...R,
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                fontWeight: 600,
                background: on ? '#f0fdf4' : 'transparent',
                color: on ? G : MU,
              }}
            >
              <I n={ic} />
              <span style={{ flex: 1 }}>{l}</span>
              {k === 'reminders' && openReminders > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: on ? '#fce7f3' : '#f1f5f9',
                    color: '#db2777',
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {openReminders}
                </span>
              )}
            </P>
          );
        })}
      </V>

      <P
        onPress={() => setNav({ page: 'settings' })}
        style={{
          ...R,
          gap: 12,
          padding: '12px 12px',
          borderRadius: 10,
          fontWeight: 700,
          borderTop: '1px solid ' + BD,
          color: nav.page === 'settings' ? G : MU,
        }}
      >
        <Av n={user.name} s={24} url={user.avatarUrl} />
        {user.name}
      </P>
    </V>
  );

  // Mobile Bottom Navigation Bar
  // Mobile Bottom Navigation Bar matching prototype line 423
  const bottomBar = (
    <V
      style={{
        flexDirection: 'row',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid ' + BD,
        zIndex: 10,
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
      }}
    >
      {[
        ['home', 'Home', 'home'],
        ['clients', 'Clients', 'users'],
        ['+'],
        ['inbox', 'Inbox', 'inbox'],
        ['settings', user.name, 'user'],
      ].map(([k, l, ic]) => {
        if (k === '+') {
          return (
            <P
              key={k}
              onPress={() => setPlusMenuOpen(true)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  background: G,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -24,
                  boxShadow: '0 4px 12px #16a34a66',
                }}
              >
                <I n="plus" s={28} />
              </div>
            </P>
          );
        }

        const on = nav.page === k || (k === 'clients' && nav.page === 'clientDetail');
        return (
          <P
            key={k}
            onPress={() => setNav({ page: k })}
            style={{
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 0 8px',
              fontSize: 12.5,
              fontWeight: 700,
              color: on ? '#0b1b16' : '#475569',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                height: 32,
                width: 62,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                background: on ? '#dcfce7' : 'transparent',
                color: on ? '#15803d' : '#475569',
              }}
            >
              {k === 'settings' ? (
                <div
                  style={{
                    borderRadius: '50%',
                    padding: 1,
                    border: '2px solid ' + (on ? G : 'transparent'),
                    display: 'flex',
                  }}
                >
                  <Av n={user.name} s={24} url={user.avatarUrl} />
                </div>
              ) : (
                <I n={ic} s={25} />
              )}
            </div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64 }}>
              {l}
            </span>
          </P>
        );
      })}
    </V>
  );

  // Active Page Body
  const activeClient = clients.find((c) => c.id === nav.id);

  let pageContent = null;
  if (nav.page === 'home') {
    pageContent = (
      <Home
        clients={clients}
        tasks={tasks}
        notes={notes}
        onNavigate={(p, params) => setNav({ page: p, params })}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        onRefreshTasks={loadAllData}
      />
    );
  } else if (nav.page === 'clients') {
    pageContent = (
      <Clients
        clients={clients}
        team={team}
        onOpenClient={(id) => setNav({ page: 'clientDetail', id })}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
      />
    );
  } else if (nav.page === 'clientDetail' && activeClient) {
    pageContent = (
      <ClientDetail
        client={activeClient}
        tasks={tasks}
        team={team}
        onBack={() => setNav({ page: 'clients' })}
        onRefreshClient={loadAllData}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        onNavigate={(p, id) => setNav({ page: p, id })}
      />
    );
  } else if (nav.page === 'inbox') {
    pageContent = (
      <Inbox
        team={team}
        initialBroadcast={nav.params?.broadcast}
        selectedChatId={nav.id || null}
        onSelectChat={(chatId) => setNav({ page: 'inbox', id: chatId || undefined })}
      />
    );
  } else if (nav.page === 'tasks') {
    pageContent = (
      <TasksPage
        tasks={tasks}
        team={team}
        onRefreshTasks={loadAllData}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        onNavigate={(p) => setNav({ page: p })}
      />
    );
  } else if (nav.page === 'reminders') {
    pageContent = (
      <RemindersPage
        tasks={tasks}
        onRefreshTasks={loadAllData}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        onNavigate={(p) => setNav({ page: p })}
      />
    );
  } else if (nav.page === 'notes') {
    pageContent = (
      <NotesPage
        notes={notes}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        onNavigate={(p) => setNav({ page: p })}
      />
    );
  } else if (nav.page === 'reports') {
    pageContent = (
      <ReportsPage
        tasks={tasks}
        team={team}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
      />
    );
  } else if (nav.page === 'team') {
    pageContent = (
      <TeamPage
        team={team}
        tasks={tasks}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        onNavigate={(p, id) => setNav({ page: p, id })}
      />
    );
  } else if (nav.page === 'emp') {
    const selectedEmp = team.find((u) => u.id === nav.id || u.name === nav.id) || team[0];
    pageContent = (
      <EmpProfilePage
        user={selectedEmp}
        tasks={tasks}
        clients={clients}
        onBack={() => setNav({ page: 'team' })}
        onRefreshTasks={loadAllData}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
      />
    );
  } else if (nav.page === 'settings') {
    pageContent = (
      <SettingsPage
        team={team}
        onRefreshTeam={loadAllData}
        onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
      />
    );
  }



  // Notifications Drawer matching prototype (Right slide-over on wide, bottom sheet on mobile)
  const notificationsDrawer = notificationsOpen && (() => {
    // Filter list by category or unread
    const list = visibleNotifications.filter((n) => {
      if (notifFilter === 'all') return true;
      if (notifFilter === 'unread') return !n.read;
      if (notifFilter === 'task') return n.category === 'task' || n.keyType === 'task' || n.keyType === 'task_due' || n.keyType === 'task_overdue';
      if (notifFilter === 'rem') return n.category === 'rem' || n.icon === 'bell';
      if (notifFilter === 'client') return n.category === 'client' || n.keyType === 'client';
      if (notifFilter === 'msg') return n.category === 'msg' || n.keyType === 'chat';
      if (notifFilter === 'report') return n.category === 'report' || n.keyType === 'report';
      return true;
    });

    const dayOf = (n: NotificationItem) => {
      if (!n.createdAt) return 0;
      const d0 = new Date();
      d0.setHours(0, 0, 0, 0);
      return Math.max(0, Math.round((d0.getTime() - new Date(n.createdAt).setHours(0, 0, 0, 0)) / 864e5));
    };

    const agoN = (t: string | undefined) => {
      if (!t) return '';
      const mn = Math.floor((Date.now() - new Date(t).getTime()) / 60000);
      return mn < 1 ? 'Just now' : mn < 60 ? mn + 'm ago' : mn < 1440 ? Math.floor(mn / 60) + 'h ago' : mn < 2880 ? 'Yesterday' : fmt(new Date(t).toISOString().slice(0, 10));
    };

    const groups: [string, (d: number) => boolean][] = [
      ['TODAY', (x) => x === 0],
      ['YESTERDAY', (x) => x === 1],
      ['EARLIER', (x) => x >= 2],
    ];
    const groupedItems = groups
      .map(([l, fn]) => [l, list.filter((n) => fn(dayOf(n)))] as [string, NotificationItem[]])
      .filter((x) => x[1].length > 0);

    const filterOptions: [typeof notifFilter, string][] = [
      ['all', 'All'],
      ['unread', 'Unread'],
      ['task', 'Tasks'],
      ['rem', 'Reminders'],
      ['client', 'Clients'],
      ['msg', 'Messages'],
      ['report', 'Reports'],
    ];

    const clearAll = async () => {
      const unreadIds = unreadNotifs.map((n) => n.id);
      if (unreadIds.length > 0) {
        await api.notifs.markAllRead({ ids: unreadIds });
        setNotifications((prev) =>
          prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
        );
      }
      toast('Unread count cleared · notification history kept');
    };

    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setNotificationsOpen(false);
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 75,
          background: wide ? 'rgba(15,23,42,.20)' : '#f3f6f4',
          display: 'flex',
          flexDirection: wide ? 'row' : 'column',
          justifyContent: wide ? 'flex-end' : 'initial',
        }}
      >
        <div
          style={{
            width: wide ? 'min(430px, 36vw)' : '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f3f6f4',
            boxShadow: wide ? '-14px 0 40px rgba(15,23,42,.14)' : 'none',
            borderLeft: wide ? '1px solid ' + BD : 'none',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#fff',
              borderBottom: '1px solid ' + BD,
              padding: 'calc(10px + env(safe-area-inset-top,0px)) 8px 0',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 8 }}>
              <P
                onPress={() => setNotificationsOpen(false)}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', color: '#334155' }}
              >
                <I n="back" s={22} />
              </P>
              <b style={{ fontSize: 20, flex: 1 }}>
                Notifications{unreadNotifs.length > 0 ? ` (${unreadNotifs.length})` : ''}
              </b>
              {visibleNotifications.length > 0 && (
                <P
                  onPress={clearAll}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#15803d',
                    background: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '7px 10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4 4L19 6.5" />
                  </svg>
                  Clear
                </P>
              )}
            </div>

            {/* Filter Strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px 10px', minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  padding: '0 4px',
                  scrollbarWidth: 'none',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {filterOptions.map(([k, l]) => {
                  const on = notifFilter === k;
                  return (
                    <P
                      key={k}
                      onPress={() => setNotifFilter(k)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 20,
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                        border: '1px solid ' + (on ? G : BD),
                        background: on ? '#dcfce7' : '#fff',
                        color: on ? '#15803d' : MU,
                      }}
                    >
                      {l}
                    </P>
                  );
                })}
              </div>
            </div>
          </div>

          {/* List grouped by Today, Yesterday, Earlier */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 12px calc(20px + env(safe-area-inset-bottom,0px))' }}>
            {groupedItems.map(([l, items]) => (
              <React.Fragment key={l}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#64748b', padding: '8px 4px 8px' }}>
                  {l}
                </div>
                {items.map((n) => (
                  <P
                    key={n.id}
                    onPress={() => handleNotificationClick(n)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 12px',
                      borderRadius: 14,
                      background: n.read ? '#fff' : '#f0fdf4',
                      border: '1px solid ' + (n.read ? BD : '#bbf7d0'),
                      marginBottom: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        background: (n.color || G) + '1a',
                        color: n.color || G,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <I n={n.icon || 'bell'} s={19} />
                    </div>
                    <V style={{ flex: 1, gap: 2, minWidth: 0 }}>
                      <b style={{ fontSize: 14.5, fontWeight: n.read ? 600 : 700, lineHeight: 1.3 }}>
                        {n.title}
                      </b>
                      <span
                        style={{
                          fontSize: 12.5,
                          color: MU,
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {n.subtitle}
                      </span>
                    </V>
                    <V style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: MU, whiteSpace: 'nowrap' }}>
                        {agoN(n.createdAt)}
                      </span>
                      {!n.read && <span style={{ width: 9, height: 9, borderRadius: 5, background: G }} />}
                    </V>
                  </P>
                ))}
              </React.Fragment>
            ))}

            {!list.length && (
              <div style={{ padding: '60px 16px', textAlign: 'center', color: MU }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: '#94a3b8' }}>
                  <I n="bell" s={34} />
                </div>
                {notifFilter === 'unread' ? "You're all caught up." : 'Nothing here yet.'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })();

  // Mobile Fullscreen Search Panel matching prototype line 437
  const mobileSearchPanel = () => {
    const q = searchText.trim().toLowerCase();
    const close = () => {
      setMobileSearchOpen(false);
      setSearchText('');
    };

    const hl = (t: string) => {
      t = String(t || '');
      const firstWord = q.split(/\s+/).filter(Boolean)[0] || '';
      const k = firstWord ? t.toLowerCase().indexOf(firstWord) : -1;
      return k < 0 ? (
        t
      ) : (
        <>
          {t.slice(0, k)}
          <mark style={{ background: '#bbf7d0', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>
            {t.slice(k, k + firstWord.length)}
          </mark>
          {t.slice(k + firstWord.length)}
        </>
      );
    };

    const rowS: React.CSSProperties = {
      ...R,
      flexDirection: 'row',
      gap: 12,
      padding: '10px 16px',
      alignItems: 'center',
    };
    const ell: React.CSSProperties = {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };

    const row = (
      key: string,
      lead: React.ReactNode,
      title: string,
      sub: string,
      on: () => void,
      badge?: string
    ) => (
      <P key={key} onPress={on} style={rowS}>
        {lead}
        <V style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <b style={ell}>{hl(title)}</b>
          <span style={{ fontSize: 13, color: MU, ...ell }}>{hl(sub)}</span>
        </V>
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#15803d',
              background: '#dcfce7',
              padding: '2px 8px',
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
      </P>
    );

    const ib = (ic: string, bg: string, co: string) => (
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          background: bg,
          color: co,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <I n={ic} s={20} />
      </div>
    );

    const matchClients = clients.filter(
      (k) =>
        !q ||
        [k.name, k.company, k.phone, k.email, k.loc, k.source, k.referrer, k.status].some((val) =>
          String(val || '').toLowerCase().includes(q)
        )
    );
    const matchTasks = tasks.filter(
      (t) =>
        t.type !== 'Reminder' &&
        (!q ||
          [t.title, t.desc, t.client?.name, t.stageName, t.note].some((val) =>
            String(val || '').toLowerCase().includes(q)
          ))
    );
    const matchReminders = tasks.filter(
      (t) =>
        t.type === 'Reminder' &&
        (!q ||
          [t.title, t.desc, t.client?.name, t.stageName, t.note].some((val) =>
            String(val || '').toLowerCase().includes(q)
          ))
    );
    const matchNotes = notes.filter(
      (n) =>
        !q ||
        [n.title, n.body, n.client?.name].some((val) =>
          String(val || '').toLowerCase().includes(q)
        )
    );

    const sec = (t: string, n: number, items: React.ReactNode) =>
      n > 0 ? (
        <V key={t} style={{ paddingBottom: 4 }}>
          <span
            style={{
              padding: '14px 16px 4px',
              fontSize: 12,
              fontWeight: 700,
              color: MU,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {t} · {n}
          </span>
          {items}
        </V>
      ) : null;

    const rC = (k: Client) =>
      row(
        'c' + k.id,
        <Av n={k.name} s={42} />,
        k.name,
        [k.company || k.type, k.phone].filter(Boolean).join(' · '),
        () => {
          close();
          setNav({ page: 'clientDetail', id: k.id });
        },
        k.status !== 'Active Client' ? k.status : ''
      );

    const rT = (t: Task) =>
      row(
        't' + t.id,
        ib(t.type === 'Reminder' ? 'bell' : 'task', t.type === 'Reminder' ? '#fce7f3' : '#dcfce7', t.type === 'Reminder' ? '#db2777' : '#15803d'),
        t.title,
        (t.client?.name || 'Personal') + ' · ' + fmt(t.date) + ' ' + t12(t.time),
        () => {
          close();
          setActiveModal({ type: 'taskView', data: t });
        },
        t.done ? 'Done' : ''
      );

    const rN = (n: Note) =>
      row(
        'n' + n.id,
        ib('note', '#e0f2fe', '#0284c7'),
        n.title || 'Note',
        (n.client?.name || 'Personal') + ' · ' + (n.body || '').slice(0, 45),
        () => {
          close();
          setActiveModal({ type: 'note', data: n });
        }
      );

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#fff',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <V
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            padding: 'calc(10px + env(safe-area-inset-top,0px)) 10px 8px 6px',
            borderBottom: '1px solid ' + BD,
          }}
        >
          <IB n="back" s={24} onPress={close} style={{ color: '#0b1b16' }} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f3f6f4',
              borderRadius: 24,
              padding: '0 14px',
              height: 46,
              color: MU,
            }}
          >
            <I n="search" s={18} />
            <input
              ref={mobileSearchRef}
              autoFocus
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search clients, tasks, reminders…"
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: 'none',
                background: 'transparent',
                fontSize: 16,
                color: '#0b1b16',
              }}
            />
            {searchText && (
              <P onPress={() => setSearchText('')} style={{ color: MU }}>
                <I n="x" s={18} />
              </P>
            )}
          </div>
        </V>

        <V style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          {q ? (
            <V>
              {sec('Clients', matchClients.length, matchClients.slice(0, 8).map(rC))}
              {sec('Tasks', matchTasks.length, matchTasks.slice(0, 8).map(rT))}
              {sec('Reminders', matchReminders.length, matchReminders.slice(0, 8).map(rT))}
              {sec('Notes', matchNotes.length, matchNotes.slice(0, 8).map(rN))}
              {matchClients.length + matchTasks.length + matchReminders.length + matchNotes.length === 0 && (
                <V style={{ alignItems: 'center', gap: 8, padding: '48px 24px', color: MU }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      background: '#f3f6f4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <I n="search" s={24} />
                  </div>
                  <b style={{ color: '#0b1b16' }}>No results</b>
                  <span style={{ textAlign: 'center' }}>
                    Nothing matches “{searchText.trim()}”. Try a name, phone number, or service.
                  </span>
                </V>
              )}
            </V>
          ) : (
            <V>
              {sec('Recent clients', clients.slice(0, 4).length, clients.slice(0, 4).map(rC))}
              {sec(
                'Next reminders',
                tasks.filter((t) => t.type === 'Reminder' && !t.done).slice(0, 3).length,
                tasks.filter((t) => t.type === 'Reminder' && !t.done).slice(0, 3).map(rT)
              )}
              <span style={{ padding: '16px', color: MU, fontSize: 13 }}>
                Search by name, company, phone, email, service, task, reminder or note.
              </span>
            </V>
          )}
        </V>
      </div>
    );
  };

  return (
    <V style={{ flexDirection: wide ? 'row' : 'column', minHeight: '100vh', width: '100%' }}>
      {wide && sidebar}

      <V style={{ flex: 1, minWidth: 0 }}>
        {topBar}
        <V style={{ padding: 16, paddingBottom: wide ? 24 : 116, maxWidth: wide && nav.page === 'inbox' ? 1240 : 980, width: '100%', margin: '0 auto' }}>
          {pageContent}
        </V>
      </V>

      {!wide && bottomBar}

      {/* Mobile Fullscreen Search Panel matching prototype */}
      {!wide && mobileSearchOpen && mobileSearchPanel()}



      {/* Notifications drawer */}
      {notificationsDrawer}

      {/* Mobile Floating Plus Menu */}
      {plusMenuOpen && (
        <div onClick={() => setPlusMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: '#0f172a66', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '22px 22px 0 0', padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <b style={{ fontSize: 17, marginBottom: 6 }}>Create New</b>
            {[
              ['Client', 'adduser', () => setActiveModal({ type: 'client' })],
              ['Task', 'task', () => setActiveModal({ type: 'task' })],
              ['Reminder', 'bell', () => setActiveModal({ type: 'reminder' })],
              ['Note', 'note', () => setActiveModal({ type: 'note' })],
              ['Message', 'chat', () => setNav({ page: 'inbox', params: { broadcast: true } })],
            ].map(([l, ic, fn]: any) => (
              <P
                key={l}
                onPress={() => {
                  setPlusMenuOpen(false);
                  fn();
                }}
                style={{ ...R, gap: 12, padding: '12px 8px', fontWeight: 600 }}
              >
                <I n={ic} s={20} />
                {l}
              </P>
            ))}
          </div>
        </div>
      )}

      {/* Modals Dispatcher */}
      {activeModal?.type === 'client' && (
        <ClientForm
          client={activeModal.data}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'task' && (
        <TaskForm
          clientId={activeModal.data?.clientId}
          clients={clients}
          team={team}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'reminder' && (
        <ReminderFormModal
          clientId={activeModal.data?.clientId}
          serviceId={activeModal.data?.serviceId}
          clients={clients}
          team={team}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'svc' && (
        <SvcForm
          clientId={activeModal.data?.clientId}
          service={activeModal.data?.service}
          team={team}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'stage' && (
        <StageForm
          client={activeModal.data?.client}
          service={activeModal.data?.service}
          team={team}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'decide' && (
        <DecideForm
          client={activeModal.data?.client}
          service={activeModal.data?.service}
          decisionStageId={activeModal.data?.decisionStageId}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'people' && (
        <PeopleModal
          client={activeModal.data?.client}
          team={team}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'custPipeline' && (
        <CustPipelineModal
          service={activeModal.data?.service}
          isDefault={activeModal.data?.isDefault}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'menu' && (
        <MenuModal
          title={activeModal.data?.title || 'Actions'}
          items={activeModal.data?.items || []}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === 'pipe' && (
        <PipelineOverviewModal
          client={activeModal.data?.client}
          service={activeModal.data?.service}
          onClose={() => setActiveModal(null)}
          onOpenModal={(t, d) => setActiveModal({ type: t, data: d })}
        />
      )}

      {activeModal?.type === 'note' && (
        <NoteForm
          note={activeModal.data}
          clients={clients}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'comm' && (
        <CommunicationForm
          clientId={activeModal.data?.clientId}
          comm={activeModal.data?.comm}
          team={team}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {activeModal?.type === 'emp' && (
        <EmpModal
          user={activeModal.data}
          onClose={() => setActiveModal(null)}
          onSaved={() => {
            loadAllData();
            refreshUser();
          }}
        />
      )}

      {/* Document Form Modal */}
      {activeModal?.type === 'doc' && (
        <DocFormModal
          clientId={activeModal.data?.clientId}
          doc={activeModal.data?.doc}
          services={activeModal.data?.services || clients.find(c => c.id === activeModal.data?.clientId)?.services || []}
          onClose={() => setActiveModal(null)}
          onSuccess={loadAllData}
        />
      )}

      {/* Invoice Form Modal */}
      {activeModal?.type === 'invoice' && (
        <InvoiceFormModal
          clientId={activeModal.data?.clientId}
          invoice={activeModal.data?.invoice}
          services={activeModal.data?.services || clients.find(c => c.id === activeModal.data?.clientId)?.services || []}
          existingInvoiceCount={activeModal.data?.existingInvoiceCount || 0}
          onClose={() => setActiveModal(null)}
          onSuccess={loadAllData}
        />
      )}

      {/* Soft Delete Client Confirm Modal */}
      {activeModal?.type === 'deleteClient' && (
        <DeleteClientConfirmModal
          client={activeModal.data?.client}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            loadAllData();
            setNav({ page: 'clients' });
          }}
        />
      )}

      {/* Deleted Client Profile Preview Modal */}
      {activeModal?.type === 'deletedClientProfile' && (
        <DeletedClientProfileModal
          client={activeModal.data?.client}
          onClose={() => setActiveModal(null)}
          onSuccess={loadAllData}
          onTriggerPermanentDelete={(client) => setActiveModal({ type: 'permanentDelete', data: { client } })}
        />
      )}

      {/* Permanent Delete Client Modal */}
      {activeModal?.type === 'permanentDelete' && (
        <PermanentDeleteConfirmModal
          client={activeModal.data?.client}
          onClose={() => setActiveModal(null)}
          onSuccess={loadAllData}
        />
      )}

      {/* Activity Details Modal */}
      {activeModal?.type === 'actlog' && (
        <ActLogModal
          historyItem={activeModal.data?.historyItem}
          serviceName={activeModal.data?.serviceName || 'Service'}
          clientName={activeModal.data?.clientName || 'Client'}
          tasks={tasks}
          onClose={() => setActiveModal(null)}
          onOpenTaskModal={(taskId) => {
            const targetTask = tasks.find((t) => t.id === taskId);
            if (targetTask) {
              setActiveModal({ type: 'taskView', data: targetTask });
            }
          }}
        />
      )}

      {/* Employee Credentials Modal */}
      {activeModal?.type === 'cred' && (
        <CredFormModal
          member={activeModal.data?.member}
          onClose={() => setActiveModal(null)}
          onSuccess={loadAllData}
        />
      )}

      {/* Task View Details Modal */}
      {activeModal?.type === 'taskView' && (
        <TaskViewModal
          task={activeModal.data}
          onClose={() => setActiveModal(null)}
          onSaved={loadAllData}
        />
      )}

      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 80,
            background: '#0f172a',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 20,
            zIndex: 9999,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,.25)',
          }}
        >
          {toastMsg}
        </div>
      )}
    </V>
  );
};

// Task View Details Modal
const TaskViewModal: React.FC<{ task: Task; onClose: () => void; onSaved: () => void }> = ({
  task,
  onClose,
  onSaved,
}) => {
  const { toast } = useAuth();
  const [note, setNote] = useState(task.doneNote || '');

  const handleToggle = async () => {
    try {
      await api.tasks.toggle(task.id, note);
      toast(task.done ? 'Task reopened' : 'Task marked done');
      onSaved();
      onClose();
    } catch (e: any) {
      toast('Failed to update task');
    }
  };

  const handleDelete = async () => {
    try {
      await api.tasks.delete(task.id);
      toast('Task deleted');
      onSaved();
      onClose();
    } catch (e: any) {
      toast('Failed to delete task');
    }
  };

  return (
    <Modal title={task.title} close={onClose}>
      <V style={{ gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ color: MU }}>Type:</span> <b>{task.type}</b>
          </div>
          <div>
            <span style={{ color: MU }}>Date:</span> <b>{task.date}</b>
          </div>
          <div>
            <span style={{ color: MU }}>Time:</span> <b>{t12(task.time)}</b>
          </div>
          <div>
            <span style={{ color: MU }}>Status:</span> <b>{task.done ? 'Completed' : 'To do'}</b>
          </div>
          {task.client?.name && (
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: MU }}>Client:</span> <b>{task.client.name}</b>
            </div>
          )}
          {task.service?.name && (
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: MU }}>Service:</span> <b>{task.service.name}</b>
            </div>
          )}
        </div>

        {task.desc && (
          <div style={{ fontSize: 13, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', color: '#334155' }}>
            <b style={{ color: '#0f172a', display: 'block', marginBottom: 4 }}>Description</b>
            {task.desc}
          </div>
        )}

        <F l={task.done ? 'Completion Note' : 'Add Note'}>
          <textarea
            rows={2}
            style={inp}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened?"
          />
        </F>

        <V style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <B onPress={handleDelete} style={{ color: '#dc2626', borderColor: '#fecaca' }}>
            <I n="trash" s={16} />Delete
          </B>
          <B k={1} style={{ flex: 1 }} onPress={handleToggle}>
            <I n="tick" s={16} />
            {task.done ? 'Reopen' : 'Mark Complete'}
          </B>
        </V>
      </V>
    </Modal>
  );
};
