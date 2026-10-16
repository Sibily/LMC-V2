import React, { useState } from 'react';
import { V, R, P, B, card, G, MU, BD, TODAY, add, fmt, lbl, t12, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { api } from '../api/client';

export const RemindersPage: React.FC<{
  tasks: Task[];
  onRefreshTasks: () => void;
  onOpenModal: (type: string, data?: any) => void;
  onNavigate?: (page: string) => void;
}> = ({ tasks, onRefreshTasks, onOpenModal, onNavigate }) => {
  const { user, settings, toast } = useAuth();
  const isMgmt = user?.role === 'management' && settings?.viewMode === 'management';

  const [scope, setScope] = useState<'all' | 'my'>(isMgmt ? 'all' : 'my');
  const [tab, setTab] = useState<'today' | 'up' | 'past' | 'done'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const nowHM = new Date().toTimeString().slice(0, 5);
  const wk = add(-7);

  const scopedReminders = tasks.filter((t) => {
    if (t.type !== 'Reminder') return false;
    if (!isMgmt || scope === 'my') {
      return t.whoUserId === user?.id;
    }
    return true;
  });

  const sortT = (a: Task, b: Task) => (a.date + a.time).localeCompare(b.date + b.time);
  const dsc = (a: Task, b: Task) => ((b.doneAt || '') + (b.doneTime || '')).localeCompare((a.doneAt || '') + (a.doneTime || ''));

  const sets = {
    today: scopedReminders.filter((t) => t.date === TODAY).sort((a, b) => ((a.done ? 1 : 0) - (b.done ? 1 : 0)) || sortT(a, b)),
    up: scopedReminders.filter((t) => !t.done && t.date > TODAY).sort(sortT),
    past: scopedReminders.filter((t) => t.date < TODAY && (t.date >= wk || !t.done)).sort((a, b) => sortT(b, a)),
    done: scopedReminders.filter((t) => t.done).sort(dsc),
  };

  const list = selectedDate
    ? scopedReminders.filter((t) => t.date === selectedDate).sort((a, b) => ((a.done ? 1 : 0) - (b.done ? 1 : 0)) || sortT(a, b))
    : sets[tab];

  const keyFn = (t: Task) => (tab === 'done' && !selectedDate ? (t.doneAt || t.date) : t.date);
  const dateGroups = Array.from(new Set(list.map(keyFn)));

  const tabMeta: [keyof typeof sets, string, string][] = [
    ['today', 'Today', 'cal'],
    ['up', 'Upcoming', 'clock'],
    ['past', 'Past', 'history'],
    ['done', 'Done', 'checks'],
  ];

  const nm: Record<string, string> = {
    today: 'Today',
    up: 'Upcoming',
    past: 'Past 7 days',
    done: 'Completed',
  };

  const em: Record<string, string> = {
    today: 'Nothing for today',
    up: 'No upcoming reminders',
    past: 'Nothing in the last 7 days',
    done: 'Completed reminders show here',
  };

  const toggleReminder = async (t: Task) => {
    try {
      await api.tasks.toggle(t.id);
      toast(t.done ? 'Reminder reopened' : 'Reminder marked done');
      onRefreshTasks();
    } catch (e: any) {
      toast('Failed to update reminder');
    }
  };

  // 17 days around today: add(-3) to add(13)
  const scrubberDays = Array.from({ length: 17 }, (_, i) => add(i - 3));

  const remRow = (t: Task) => {
    const isLate = !t.done && (t.date < TODAY || (t.date === TODAY && t.time < nowHM));
    return (
      <V key={t.id} style={{ ...R, flexDirection: 'row', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
        <P
          onPress={() => toggleReminder(t)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            border: '2px solid ' + (t.done ? G : isLate ? '#fca5a5' : '#cbd5e1'),
            background: t.done ? G : '#fff',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {t.done && <I n="tick" s={15} />}
        </P>
        <P onPress={() => onOpenModal('taskView', t)} style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
          <b
            style={{
              textDecoration: t.done ? 'line-through' : 'none',
              color: t.done ? MU : '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.title}
          </b>
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: t.client?.name ? '#1d4ed8' : MU,
                background: t.client?.name ? '#dbeafe' : '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              <I n={t.client?.name ? 'users' : 'user'} s={11} />
              {t.client?.name || 'Me'}
            </span>
            {t.service?.name && (
              <span style={{ fontSize: 11, color: MU }}>
                {t.service.name}
              </span>
            )}
            {isMgmt && scope === 'all' && t.whoUser?.name && (
              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                · {t.whoUser.name}
              </span>
            )}
          </V>
        </P>
        <V style={{ alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: t.done ? MU : isLate ? '#dc2626' : '#be185d',
              background: t.done ? '#f1f5f9' : isLate ? '#fee2e2' : '#fce7f3',
              padding: '3px 8px',
              borderRadius: 20,
            }}
          >
            <I n="clock" s={11} />
            {t.done
              ? t12(t.doneTime || '')
              : (t.date === TODAY || t.date < TODAY ? '' : fmt(t.date) + ' · ') + t12(t.time)}
          </span>
          {isLate && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
              MISSED
            </span>
          )}
        </V>
      </V>
    );
  };

  return (
    <V style={{ gap: 12 }}>
      {/* Back to Home & Title Row */}
      {onNavigate && (
        <P onPress={() => onNavigate('home')} style={{ ...R, gap: 6, color: MU, cursor: 'pointer' }}>
          <I n="back" s={18} />Back
        </P>
      )}

      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 20 }}>Reminders</b>
        <B k={1} onPress={() => onOpenModal('reminder')}>
          <I n="plus" s={16} />Add
        </B>
      </V>

      {/* Scope Switcher for Management */}
      {isMgmt && (
        <V style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'my'] as const).map((s) => (
            <B key={s} k={scope === s} onPress={() => setScope(s)}>
              {s === 'all' ? 'All Reminders' : 'My Reminders'}
            </B>
          ))}
        </V>
      )}

      {/* Tab Header with Count Badge */}
      <V style={{ gap: 6 }}>
        <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <b style={{ fontSize: 15 }}>{selectedDate ? fmt(selectedDate) : nm[tab]}</b>
          <span style={{ background: '#fce7f3', color: '#be185d', fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
            {list.length}
          </span>
        </V>

        {/* 4 Icon Tabs with Badge counts */}
        <V style={{ flexDirection: 'row', gap: 8 }}>
          {tabMeta.map(([k, lb, ic]) => {
            const on = tab === k && !selectedDate;
            const n = k === 'done' || k === 'up' ? sets[k].length : sets[k].filter((t) => !t.done).length;
            return (
              <P
                key={k}
                title={lb}
                onPress={() => {
                  setTab(k);
                  setSelectedDate('');
                }}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  position: 'relative',
                  background: on ? G : '#fff',
                  color: on ? '#fff' : k === 'past' && n > 0 ? '#dc2626' : MU,
                  border: '1px solid ' + (on ? G : BD),
                }}
              >
                <I n={ic} s={20} />
                {n > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      padding: '0 4px',
                      borderRadius: 9,
                      background: k === 'past' ? '#dc2626' : on ? '#fff' : '#0f172a',
                      color: k === 'past' ? '#fff' : on ? G : '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #f3f6f4',
                    }}
                  >
                    {n}
                  </span>
                )}
              </P>
            );
          })}
        </V>
      </V>

      {/* Date Scrubber + Calendar Picker */}
      <V style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0, padding: '2px 0' }}>
          {scrubberDays.map((d) => {
            const on = selectedDate === d;
            const dt = new Date(d + 'T00:00');
            const has = scopedReminders.some((t) => t.date === d && !t.done);
            return (
              <P
                key={d}
                onPress={() => setSelectedDate(on ? '' : d)}
                style={{
                  flex: '0 0 auto',
                  width: 46,
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '8px 0',
                  borderRadius: 14,
                  background: on ? G : '#fff',
                  border: '1px solid ' + (on ? G : d === TODAY ? '#86efac' : BD),
                  color: on ? '#fff' : '#0f172a',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>
                  {dt.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <b style={{ fontSize: 16, lineHeight: 1.1 }}>{dt.getDate()}</b>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    background: has ? (on ? '#fff' : '#db2777') : 'transparent',
                  }}
                />
              </P>
            );
          })}
        </div>

        <div
          style={{
            position: 'relative',
            flexShrink: 0,
            width: 46,
            height: 62,
            borderRadius: 14,
            border: '1px solid ' + (selectedDate && !scrubberDays.includes(selectedDate) ? G : BD),
            background: '#fff',
            color: MU,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <I n="cal" s={20} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </div>
      </V>

      {/* Reminders List grouped by date */}
      <V style={card}>
        {dateGroups.map((d) => (
          <V key={d}>
            {(tab !== 'today' || selectedDate) && (
              <V style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, color: MU }}>
                <I n="cal" s={13} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{lbl(d)}</span>
              </V>
            )}
            {list.filter((t) => keyFn(t) === d).map(remRow)}
          </V>
        ))}

        {!list.length && (
          <EmptyState
            icon="bell"
            title={selectedDate ? 'No reminders on this date' : em[tab]}
            desc="Set reminders for upcoming client follow-ups, document requests, and deadlines."
            actionLabel="+ Add Reminder"
            onAction={() => onOpenModal('reminder')}
            color="#db2777"
          />
        )}
      </V>
    </V>
  );
};
