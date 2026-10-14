import React, { useState } from 'react';
import { V, R, P, B, card, G, MU, BD, TODAY, add, fmt, lbl, t12, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { api } from '../api/client';
import { DateScrubber } from '../components/DateScrubber';

export const RemindersPage: React.FC<{
  tasks: Task[];
  onRefreshTasks: () => void;
  onOpenModal: (type: string, data?: any) => void;
  onNavigate?: (page: string) => void;
}> = ({ tasks, onRefreshTasks, onOpenModal, onNavigate }) => {
  const { user, settings, toast } = useAuth();
  const isMgmt = user?.role === 'management' && settings?.viewMode === 'management';

  const openTasksCount = tasks.filter((t) => t.type !== 'Reminder' && !t.done && (isMgmt ? true : t.whoUserId === user?.id)).length;
  const openRemindersCount = tasks.filter((t) => t.type === 'Reminder' && !t.done && (isMgmt ? true : t.whoUserId === user?.id)).length;
  const [scope, setScope] = useState<'all' | 'my'>(isMgmt ? 'all' : 'my');
  const [tab, setTab] = useState<'today' | 'up' | 'past' | 'done'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const nowHM = new Date().toTimeString().slice(0, 5);
  const scopedReminders = tasks.filter((t) => {
    if (t.type !== 'Reminder') return false;
    if (!isMgmt || scope === 'my') {
      return t.whoUserId === user?.id;
    }
    return true;
  });

  const list = scopedReminders.filter((t) => {
    if (selectedDate) return t.date === selectedDate;
    if (tab === 'today') return !t.done && t.date <= TODAY;
    if (tab === 'up') return !t.done && t.date > TODAY;
    if (tab === 'past') return !t.done && t.date < TODAY;
    if (tab === 'done') return t.done;
    return true;
  });

  const toggleReminder = async (t: Task) => {
    try {
      await api.tasks.toggle(t.id);
      toast(t.done ? 'Reminder reopened' : 'Reminder marked done');
      onRefreshTasks();
    } catch (e: any) {
      toast('Failed to update reminder');
    }
  };


  return (
    <V style={{ gap: 12 }}>
      {/* Top row */}
      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 18 }}>{isMgmt ? 'All Reminders' : 'My Reminders'} ({list.length})</b>
        <B k={1} onPress={() => onOpenModal('reminder')}>
          <I n="plus" s={16} />Add Reminder
        </B>
      </V>

      {/* Management Scope Filter */}
      {isMgmt && (
        <V style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'my'] as const).map((s) => (
            <B key={s} k={scope === s} onPress={() => setScope(s)}>
              {s === 'all' ? 'All Reminders' : 'My Reminders'}
            </B>
          ))}
        </V>
      )}

      {/* Date Scrubber with 2-way slide arrows */}
      <DateScrubber
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        hasItemsOnDate={(d) => scopedReminders.some((t) => t.date === d && !t.done)}
        itemDotColor="#db2777"
      />

      {/* Tabs */}
      <V style={{ flexDirection: 'row', gap: 6 }}>
        {[
          ['today', 'Today', 'cal'],
          ['up', 'Upcoming', 'clock'],
          ['past', 'Past', 'history'],
          ['done', 'Done', 'checks'],
        ].map(([k, l, ic]) => (
          <P
            key={k}
            onPress={() => {
              setTab(k as any);
              setSelectedDate('');
            }}
            style={{
              flex: 1,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: 14,
              border: '1px solid ' + (tab === k && !selectedDate ? G : BD),
              background: tab === k && !selectedDate ? G : '#fff',
              color: tab === k && !selectedDate ? '#fff' : MU,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <I n={ic} s={16} />
            {l}
          </P>
        ))}
      </V>

      {/* Reminder items */}
      <V style={card}>
        {list.map((t) => {
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
                {t.done && <I n="tick" s={14} />}
              </P>
              <P onPress={() => onOpenModal('taskView', t)} style={{ flex: 1, flexDirection: 'column', gap: 3 }}>
                <b style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? MU : '#0f172a' }}>{t.title}</b>
                <span style={{ fontSize: 12, color: MU }}>
                  {t.client?.name ? t.client.name + ' · ' : ''}
                  {t.desc}
                </span>
                {isMgmt && t.whoUser?.name && (
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                    Assigned to: {t.whoUser.name}
                  </span>
                )}
              </P>
              <V style={{ alignItems: 'flex-end', gap: 2 }}>
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
                  {t12(t.time)}
                </span>
                {isLate && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>MISSED</span>}
              </V>
            </V>
          );
        })}
        {!list.length && (
          <EmptyState
            icon="bell"
            title="No reminders right now"
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
