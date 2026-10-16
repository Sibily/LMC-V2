import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { V, R, P, B, IB, card, G, MU, BD, TODAY, add, fmt, lbl, t12, tcol, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { api } from '../api/client';
import { DateScrubber } from '../components/DateScrubber';

export const TasksPage: React.FC<{
  tasks: Task[];
  team: any[];
  onRefreshTasks: () => void;
  onOpenModal: (type: string, data?: any) => void;
  onNavigate?: (page: string) => void;
}> = ({ tasks, team, onRefreshTasks, onOpenModal, onNavigate }) => {
  const { user, settings, toast } = useAuth();
  const isMgmt = user?.role === 'management' && settings?.viewMode === 'management';

  const openTasksCount = tasks.filter((t) => t.type !== 'Reminder' && !t.done && (isMgmt ? true : t.whoUserId === user?.id)).length;
  const openRemindersCount = tasks.filter((t) => t.type === 'Reminder' && !t.done && (isMgmt ? true : t.whoUserId === user?.id)).length;

  const [filterUser, setFilterUser] = useState<string>('all');
  const [tab, setTab] = useState<'today' | 'up' | 'past'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const displayedTasks = tasks.filter((t) => {
    if (t.type === 'Reminder') return false;
    if (filterUser !== 'all' && t.whoUserId !== filterUser) return false;
    if (!isMgmt && t.whoUserId !== user?.id) return false;
    return true;
  });

  const todoList = displayedTasks.filter((t) => {
    if (t.done) return false;
    if (selectedDate) return t.date === selectedDate || (selectedDate === TODAY && t.date < TODAY);
    if (tab === 'today') return t.date <= TODAY;
    if (tab === 'up') return t.date > TODAY;
    return false;
  });

  const doneList = displayedTasks.filter((t) => {
    if (!t.done) return false;
    if (selectedDate) return (t.doneAt || t.date) === selectedDate;
    if (tab === 'today') return (t.doneAt || t.date) === TODAY;
    if (tab === 'past') return (t.doneAt || t.date) < TODAY;
    return false;
  });

  const toggleTask = async (task: Task) => {
    try {
      await api.tasks.toggle(task.id);
      toast(task.done ? 'Task reopened' : 'Task completed');
      onRefreshTasks();
    } catch (e: any) {
      toast('Failed to update task');
    }
  };

  const exportExcel = () => {
    try {
      const all = [...todoList, ...doneList];
      const data = all.map((t) => ({
        Date: t.done ? t.doneAt || t.date : t.date,
        Time: t.time,
        Employee: t.whoUser?.name || 'Unassigned',
        Task: t.title,
        Type: t.type,
        Client: t.client?.name || 'Personal',
        Service: t.service?.name || '',
        Status: t.done ? 'Done' : t.date < TODAY ? 'Overdue' : 'To do',
        Note: t.doneNote || t.desc || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      XLSX.writeFile(wb, `buzzrdesk-tasks-${selectedDate || tab}.xlsx`);
      toast('Tasks exported to Excel');
    } catch (e) {
      toast('Failed to export Excel');
    }
  };


  const trow = (t: Task) => (
    <V key={t.id} style={{ ...R, flexDirection: 'row', gap: 10, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <P
        onPress={() => toggleTask(t)}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          border: '2px solid ' + (t.done ? G : '#cbd5e1'),
          background: t.done ? G : '#fff',
          color: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {t.done && <I n="tick" s={14} />}
      </P>
      <V style={{ flex: 1, gap: 2 }}>
        <b style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? MU : '#0f172a' }}>{t.title}</b>
        <span style={{ color: MU, fontSize: 12 }}>
          {isMgmt && t.whoUser?.name ? t.whoUser.name + ' · ' : ''}
          {t.client?.name ? t.client.name + ' · ' : ''}
          {t.desc}
        </span>
      </V>
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
        }}
      >
        <I n="clock" s={11} />
        {t12(t.time)}
      </span>
      <IB n="eye" onPress={() => onOpenModal('taskView', t)} />
    </V>
  );

  return (
    <V style={{ gap: 12 }}>
      {/* Top row */}
      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 18 }}>{isMgmt ? 'All Tasks' : 'My Tasks'}</b>
        <V style={{ flexDirection: 'row', gap: 8 }}>
          <B onPress={exportExcel} style={{ padding: '8px 12px', color: '#15803d' }}>
            <I n="download" s={16} />Excel
          </B>
          <B k={1} onPress={() => onOpenModal('task')}>
            <I n="plus" s={16} />Add Task
          </B>
        </V>
      </V>

      {/* Team member filter for management */}
      {isMgmt && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <P
            onPress={() => setFilterUser('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid ' + (filterUser === 'all' ? G : BD),
              background: filterUser === 'all' ? '#f0fdf4' : '#fff',
              color: filterUser === 'all' ? G : MU,
            }}
          >
            All Team
          </P>
          {team.map((u) => (
            <P
              key={u.id}
              onPress={() => setFilterUser(u.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid ' + (filterUser === u.id ? G : BD),
                background: filterUser === u.id ? '#f0fdf4' : '#fff',
                color: filterUser === u.id ? G : MU,
              }}
            >
              {u.name}
            </P>
          ))}
        </div>
      )}

      {/* Calendar Scrubber with 2-way slide arrows */}
      <DateScrubber
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        hasItemsOnDate={(d) => displayedTasks.some((t) => t.date === d && !t.done)}
        itemDotColor="#15803d"
      />

      {/* Tabs */}
      <V style={{ flexDirection: 'row', gap: 8 }}>
        {[
          ['today', 'Today', 'cal'],
          ['up', 'Upcoming', 'clock'],
          ['past', 'Done Earlier', 'history'],
        ].map(([k, l, ic]) => (
          <P
            key={k}
            title={l}
            onPress={() => {
              setTab(k as any);
              setSelectedDate('');
            }}
            style={{
              flex: 1,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 14,
              border: '1px solid ' + (tab === k && !selectedDate ? G : BD),
              background: tab === k && !selectedDate ? G : '#fff',
              color: tab === k && !selectedDate ? '#fff' : MU,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <I n={ic} s={16} />
            <span className="tab-label-desktop">{l}</span>
          </P>
        ))}
      </V>

      {/* Tasks Lists */}
      <V style={card}>
        {todoList.length > 0 && (
          <V style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              To Do · {todoList.length}
            </span>
            {todoList.map(trow)}
          </V>
        )}

        {doneList.length > 0 && (
          <V>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Done · {doneList.length}
            </span>
            {doneList.map(trow)}
          </V>
        )}

        {!todoList.length && !doneList.length && (
          <EmptyState
            icon={tab === 'today' ? 'checks' : tab === 'up' ? 'cal' : 'clock'}
            title={
              selectedDate
                ? `No tasks for ${fmt(selectedDate)}`
                : tab === 'today'
                ? 'All caught up for today!'
                : tab === 'up'
                ? 'No upcoming tasks scheduled'
                : 'No past tasks found'
            }
            desc={
              selectedDate
                ? 'There are no pending or completed tasks recorded for this date.'
                : tab === 'today'
                ? 'You have completed all pending tasks for today. Great work!'
                : tab === 'up'
                ? 'Plan ahead by creating upcoming tasks, client milestones, and deadlines.'
                : 'Tasks completed previously will be listed here.'
            }
            actionLabel={tab !== 'past' ? '+ Add New Task' : undefined}
            onAction={tab !== 'past' ? () => onOpenModal('task') : undefined}
          />
        )}
      </V>
    </V>
  );
};
