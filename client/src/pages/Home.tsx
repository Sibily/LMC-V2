import React from 'react';
import { V, R, P, card, G, MU, BD, TODAY, add, fmt, lbl, t12, tcol } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task, Note } from '../types';

interface HomeProps {
  clients: any[];
  tasks: Task[];
  notes: Note[];
  onNavigate: (page: string, params?: any) => void;
  onOpenModal: (type: string, data?: any) => void;
}

export const Home: React.FC<HomeProps> = ({ clients, tasks, notes, onNavigate, onOpenModal }) => {
  const { user, settings } = useAuth();
  const isMgmt = user?.role === 'management' && settings?.viewMode === 'management';

  const nr = (t: Task) => t.type !== 'Reminder';
  const myTasks = tasks.filter((t) => (isMgmt ? true : t.whoUserId === user?.id));

  const td = myTasks.filter((t) => nr(t) && !t.done && t.date === TODAY);
  const ov = myTasks.filter((t) => nr(t) && !t.done && t.date < TODAY);
  const upc = myTasks.filter((t) => nr(t) && !t.done && t.date > TODAY);
  const rm = myTasks.filter((t) => t.type === 'Reminder' && !t.done);
  const dtn = myTasks.filter((t) => t.done && nr(t) && t.doneAt === TODAY);

  const dates = Array.from(new Set(upc.map((t) => t.date))).slice(0, 3);
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';

  const stats = [
    { label: 'Total clients', count: clients.length, icon: 'users', color: '#2563eb', bg: '#dbeafe', action: () => onNavigate('clients') },
    { label: 'Tasks today', count: td.length, icon: 'task', color: G, bg: '#dcfce7', action: () => onNavigate('tasks', { filter: 'today' }) },
    { label: 'Upcoming tasks', count: upc.length, icon: 'cal', color: '#7c3aed', bg: '#ede9fe', action: () => onNavigate('tasks', { filter: 'up' }) },
    { label: 'Overdue', count: ov.length, icon: 'flag', color: '#dc2626', bg: '#fee2e2', action: () => onNavigate('tasks', { filter: 'today' }), alert: ov.length > 0 },
    { label: 'Reminders', count: rm.length, icon: 'bell', color: '#db2777', bg: '#fce7f3', action: () => onNavigate('reminders') },
    { label: 'Done today', count: dtn.length, icon: 'checks', color: '#15803d', bg: '#dcfce7', action: () => onNavigate('tasks', { filter: 'today', tab: 'done' }) },
  ];

  const quickActions = [
    { label: 'Client', icon: 'adduser', color: '#16a34a', action: () => onOpenModal('client') },
    { label: 'Task', icon: 'task', color: '#7c3aed', action: () => onOpenModal('task') },
    { label: 'Reminder', icon: 'bell', color: '#db2777', action: () => onOpenModal('reminder') },
    { label: 'Note', icon: 'note', color: '#0ea5e9', action: () => onOpenModal('note') },
    { label: 'Message', icon: 'mega', color: '#0f766e', action: () => onNavigate('inbox', { broadcast: true }) },
  ];

  const trow = (t: Task) => (
    <V key={t.id} style={{ ...R, flexDirection: 'row', gap: 10, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: tcol(t.type), flexShrink: 0 }} />
      <P onPress={() => onOpenModal('taskView', t)} style={{ flex: 1, flexDirection: 'column', gap: 3 }}>
        <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</b>
        <span style={{ color: MU, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.client?.name ? t.client.name + ' · ' : ''}
          {t.desc}
        </span>
      </P>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#475569',
          background: '#f1f5f9',
          padding: '3px 8px',
          borderRadius: 20,
          flexShrink: 0,
        }}
      >
        <I n="clock" s={11} />
        {t12(t.time)}
      </span>
    </V>
  );

  return (
    <V style={{ gap: 14 }}>
      {/* Greeting Header */}
      <V>
        <b style={{ fontSize: 25, letterSpacing: -0.5 }}>
          {greeting}, {user?.name || 'User'}
        </b>
        <span style={{ color: MU }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        {isMgmt && (
          <span
            style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              color: '#166534',
              background: '#dcfce7',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 20,
            }}
          >
            Management view · all clients and team
          </span>
        )}
      </V>

      {/* Quick Action Circles */}
      <V style={{ flexDirection: 'row', gap: 20, padding: '2px 2px 0' }}>
        {quickActions.map(({ label, icon, color, action }) => (
          <P key={label} onPress={action} style={{ flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
            <div style={{ width: 58, height: 58, borderRadius: 29, padding: 3, border: '2px dashed ' + color, display: 'flex' }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: '50%',
                  background: color + '1a',
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <I n={icon} s={22} />
              </div>
            </div>
            <span
              style={{
                position: 'absolute',
                right: 0,
                top: 45,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #f3f6f4',
              }}
            >
              <I n="plus" s={12} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, maxWidth: 78, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </span>
          </P>
        ))}
      </V>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {stats.map(({ label, count, icon, color, bg, action, alert }) => (
          <P
            key={label}
            onPress={action}
            style={{
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: 80,
              padding: 10,
              borderRadius: 14,
              background: alert ? '#fff5f5' : '#fff',
              border: '1px solid ' + (alert ? '#fecaca' : BD),
              position: 'relative',
              boxShadow: card.boxShadow,
            }}
          >
            {alert && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#dc2626',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #f3f6f4',
                }}
              >
                <I n="alert" s={10} />
              </span>
            )}
            <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: bg,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <I n={icon} s={15} />
              </div>
              <b style={{ fontSize: 20, lineHeight: 1, color: alert ? '#dc2626' : '#0f172a' }}>{count}</b>
            </V>
            <span style={{ fontSize: 11.5, color: MU, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </span>
          </P>
        ))}
      </div>

      {/* Today's Tasks */}
      <V style={card}>
        <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Today's Tasks</b>
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <P
              title="Add task"
              onPress={() => onOpenModal('task')}
              style={{
                width: 25,
                height: 25,
                borderRadius: 13,
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <I n="plus" s={14} />
            </P>
            <span style={{ background: '#f1f5f9', color: MU, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
              {td.length + ov.length}
            </span>
            <P onPress={() => onNavigate('tasks')} style={{ color: G, fontWeight: 600, fontSize: 13 }}>
              See all
            </P>
          </V>
        </V>

        {ov.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#dc2626', marginTop: 8 }}>
            <I n="alert" s={14} />
            Overdue
          </span>
        )}
        {ov.slice(0, 3).map(trow)}
        {td.length
          ? td.slice(0, Math.max(0, 3 - Math.min(ov.length, 3))).map(trow)
          : !ov.length && <span style={{ color: MU, padding: '10px 0' }}>Nothing scheduled today.</span>}
      </V>

      {/* Reminders */}
      <V style={card}>
        <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Reminders</b>
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <P
              title="Add reminder"
              onPress={() => onOpenModal('reminder')}
              style={{
                width: 25,
                height: 25,
                borderRadius: 13,
                background: '#fce7f3',
                color: '#db2777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <I n="plus" s={14} />
            </P>
            <span style={{ background: '#f1f5f9', color: MU, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
              {rm.length}
            </span>
            <P onPress={() => onNavigate('reminders')} style={{ color: G, fontWeight: 600, fontSize: 13 }}>
              See all
            </P>
          </V>
        </V>
        {rm.length ? (
          rm.slice(0, 3).map(trow)
        ) : (
          <span style={{ color: MU, padding: '10px 0' }}>No reminders. Add one with Add Reminder.</span>
        )}
      </V>

      {/* Notes */}
      <V style={card}>
        <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>My Notes</b>
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <P
              title="Add note"
              onPress={() => onOpenModal('note')}
              style={{
                width: 25,
                height: 25,
                borderRadius: 13,
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <I n="plus" s={14} />
            </P>
            <span style={{ background: '#f1f5f9', color: MU, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
              {notes.length}
            </span>
            <P onPress={() => onNavigate('notes')} style={{ color: G, fontWeight: 600, fontSize: 13 }}>
              See all
            </P>
          </V>
        </V>
        {notes.length ? (
          notes.slice(0, 3).map((n) => (
            <V key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid ' + BD, gap: 3 }}>
              <b>{n.title || 'Note'}</b>
              <span
                style={{
                  fontSize: 13,
                  color: MU,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {n.body}
              </span>
              <span style={{ fontSize: 11, color: MU }}>
                {n.client?.name || 'Personal note'} · {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
              </span>
            </V>
          ))
        ) : (
          <span style={{ color: MU, padding: '10px 0' }}>No notes yet. Add one using the + button.</span>
        )}
      </V>

      {/* Upcoming Tasks */}
      <V style={card}>
        <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Upcoming Tasks</b>
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <P
              title="Add task"
              onPress={() => onOpenModal('task')}
              style={{
                width: 25,
                height: 25,
                borderRadius: 13,
                background: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <I n="plus" s={14} />
            </P>
            <span style={{ background: '#f1f5f9', color: MU, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
              {upc.length}
            </span>
            <P onPress={() => onNavigate('tasks', { filter: 'up' })} style={{ color: G, fontWeight: 600, fontSize: 13 }}>
              See all
            </P>
          </V>
        </V>
        {dates.length ? (
          dates.map((d) => (
            <V key={d}>
              <span style={{ fontSize: 12, fontWeight: 700, color: MU, marginTop: 10 }}>{lbl(d)}</span>
              {upc.filter((t) => t.date === d).slice(0, 3).map(trow)}
            </V>
          ))
        ) : (
          <span style={{ color: MU, padding: '10px 0' }}>No upcoming tasks.</span>
        )}
      </V>
    </V>
  );
};
