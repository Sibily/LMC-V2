import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { V, R, P, B, IB, Av, card, G, MU, BD, TODAY, add, fmt, t12, tcol, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { api } from '../api/client';

export interface EmpProfilePageProps {
  user: any;
  tasks: Task[];
  clients: any[];
  onBack: () => void;
  onRefreshTasks?: () => void;
  onOpenModal: (type: string, data?: any) => void;
}

export const EmpProfilePage: React.FC<EmpProfilePageProps> = ({
  user: empUser,
  tasks,
  clients,
  onBack,
  onRefreshTasks,
  onOpenModal,
}) => {
  const { user: currentUser, toast } = useAuth();

  // Navigation tab: 'tasks' | 'reports'
  const [tab, setTab] = useState<'tasks' | 'reports'>('tasks');
  // Task filter mode: 'today' | 'up' | 'past'
  const [wt, setWt] = useState<'today' | 'up' | 'past'>('today');
  // Date strip selected date (empty string means follow wt)
  const [wd, setWd] = useState<string>('');
  // Reports frequency: 'Daily' | 'Weekly' | 'Monthly'
  const [rf, setRf] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  // Reports week offset base Monday
  const mon = (d: string) => {
    const x = new Date(d + 'T00:00');
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x.toISOString().slice(0, 10);
  };
  const addD = (d: string, n: number) => {
    const x = new Date(d + 'T00:00');
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  };
  const [wsT, setWsT] = useState<string>(mon(TODAY));
  const [wsR, setWsR] = useState<string>(mon(TODAY));
  const [rdd, setRdd] = useState<string>(TODAY);
  const [rm, setRm] = useState<string>(TODAY.slice(0, 7));
  const [rx, setRx] = useState<string>('');

  if (!empUser) {
    return (
      <V style={{ gap: 12 }}>
        <P onPress={onBack} style={{ ...R, gap: 6, color: MU, alignSelf: 'flex-start', padding: '4px 0' }}>
          <I n="back" s={18} />Back
        </P>
        <span style={{ color: MU }}>Employee not found.</span>
      </V>
    );
  }

  const isAdm = empUser.role === 'management';
  const uName = empUser.name;
  const uId = empUser.id;

  // Filter tasks belonging to this employee
  const userTasks = tasks.filter((t) => t.whoUserId === uId && t.type !== 'Reminder');
  const sortT = (a: Task, b: Task) => (a.date + a.time).localeCompare(b.date + b.time);
  const dsc = (a: Task, b: Task) => ((b.doneAt || b.date) + (b.doneTime || b.time)).localeCompare((a.doneAt || a.date) + (a.doneTime || a.time));

  const openTasks = userTasks.filter((t) => !t.done).sort(sortT);
  const doneTasks = userTasks.filter((t) => t.done).sort(dsc);
  const overdueTasks = openTasks.filter((t) => t.date < TODAY);
  const ownedClientsCount = clients.filter((c) => c.ownerId === uId || c.owner === uName).length;

  // KPI Tile Component
  const tile = (label: string, count: number | string, color: string, bg: string) => (
    <div
      key={label}
      style={{
        background: bg,
        borderRadius: 12,
        padding: '10px 8px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <b style={{ fontSize: 19, lineHeight: 1, color }}>{count}</b>
      <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>{label}</span>
    </div>
  );

  const toggleTask = async (task: Task) => {
    if (task.whoUserId !== currentUser?.id) {
      toast(`Only ${task.whoUser?.name || 'the assigned user'} can complete this task`);
      return;
    }
    try {
      await api.tasks.toggle(task.id);
      toast(task.done ? 'Task reopened' : 'Task completed');
      if (onRefreshTasks) onRefreshTasks();
    } catch (e: any) {
      toast(e.message || 'Failed to update task');
    }
  };

  const saveXLSX = (wb: any, fn: string, okMsg: string) => {
    try {
      XLSX.writeFile(wb, fn);
      toast(okMsg);
    } catch (e) {
      toast('Could not export Excel');
    }
  };

  // Task filtering for workCard
  const tOpen = openTasks.filter((t) => t.date <= TODAY).sort(sortT);
  const tDone = doneTasks.filter((t) => (t.doneAt || t.date) === TODAY).sort(dsc);
  const upTasks = openTasks.filter((t) => t.date > TODAY).sort(sortT);
  const pastTasks = doneTasks.filter((t) => (t.doneAt || t.date) < TODAY).sort(dsc);

  const dayTodo = wd ? openTasks.filter((t) => t.date === wd || (wd === TODAY && t.date < TODAY)).sort(sortT) : [];
  const dayDone = wd ? doneTasks.filter((t) => (t.doneAt || t.date) === wd).sort(dsc) : [];

  const view = wd
    ? { todo: dayTodo, done: dayDone }
    : wt === 'today'
    ? { todo: tOpen, done: tDone }
    : wt === 'up'
    ? { todo: upTasks, done: [] }
    : { todo: [], done: pastTasks };

  const cnt = view.todo.length + view.done.length;

  const exportTasks = () => {
    const list = [...view.todo, ...view.done];
    const data = list.map((t) => ({
      Date: t.done ? t.doneAt || t.date : t.date,
      Time: t.time,
      Employee: empUser.name,
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
    saveXLSX(wb, `buzzrdesk-${empUser.name.toLowerCase()}-tasks-${wd || wt}.xlsx`, 'Tasks exported');
  };

  // Date strip renderer matching prototype line 318
  const renderDateStrip = (
    currentWeekMon: string,
    onWeekChange: (newMon: string) => void,
    selected: string,
    onPickDate: (d: string) => void,
    dotFn: (d: string) => string
  ) => {
    const m0 = mon(TODAY);
    const days = Array.from({ length: 7 }, (_, i) => addD(currentWeekMon, i));
    const canBack = currentWeekMon > addD(m0, -7 * 26);
    const canFwd = currentWeekMon < addD(m0, 7 * 8);

    return (
      <V style={{ gap: 8 }}>
        <V style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {currentWeekMon === m0 ? 'This week · ' : ''}
            {fmt(currentWeekMon)} – {fmt(days[6])}
          </span>
          <V style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <P
              onPress={canBack ? () => onWeekChange(addD(currentWeekMon, -7)) : undefined}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                border: '1px solid ' + BD,
                background: '#fff',
                color: canBack ? '#0f172a' : '#cbd5e1',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <I n="back" s={18} />
            </P>
            <P
              onPress={canFwd ? () => onWeekChange(addD(currentWeekMon, 7)) : undefined}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                border: '1px solid ' + BD,
                background: '#fff',
                color: canFwd ? '#0f172a' : '#cbd5e1',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ transform: 'rotate(180deg)', display: 'flex' }}>
                <I n="back" s={18} />
              </div>
            </P>
            <div
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: 18,
                border: '1px solid ' + (selected && !days.includes(selected) ? G : BD),
                background: '#fff',
                color: MU,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <I n="cal" s={18} />
              <input
                type="date"
                value={selected || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    onPickDate(v);
                    onWeekChange(mon(v));
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                }}
              />
            </div>
          </V>
        </V>

        {/* 7 Day pill selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {days.map((d) => {
            const on = selected === d;
            const dt = new Date(d + 'T00:00');
            const c2 = dotFn(d);

            return (
              <P
                key={d}
                onPress={() => onPickDate(on ? '' : d)}
                style={{
                  minWidth: 0,
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 0',
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
                    background: c2 === 'transparent' ? 'transparent' : on ? '#fff' : c2,
                  }}
                />
              </P>
            );
          })}
        </div>
      </V>
    );
  };

  const taskRow = (t: Task) => (
    <V
      key={t.id}
      style={{
        ...R,
        flexDirection: 'row',
        gap: 10,
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          background: tcol(t.type),
          flexShrink: 0,
        }}
      />
      <V style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <b
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#0f172a',
          }}
        >
          {t.title}
        </b>
        <span
          style={{
            color: MU,
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
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
          flexShrink: 0,
        }}
      >
        <I n="clock" s={11} />
        {t.done ? fmt(t.doneAt || t.date) : ((t.date === TODAY ? '' : fmt(t.date) + ' · ') + t12(t.time))}
      </span>
      <IB n="eye" onPress={() => onOpenModal('taskView', t)} />
    </V>
  );

  const lab = (txt: string, ic: string, co: string, n: number) => (
    <V key={txt} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, color: co }}>
      <I n={ic} s={14} />
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {txt} · {n}
      </span>
    </V>
  );

  const grp = (list: Task[], keyFn: (t: Task) => string) => {
    const dates = [...new Set(list.map(keyFn))];
    return dates.map((d) => (
      <V key={d}>
        <V style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, color: MU }}>
          <I n="cal" s={13} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(d)}</span>
        </V>
        {list.filter((t) => keyFn(t) === d).map(taskRow)}
      </V>
    ));
  };

  // Reports View Calculations
  const m0 = mon(TODAY);
  const wdays = Array.from({ length: 7 }, (_, i) => addD(wsR, i));
  const monthDays = (() => {
    const [y, m] = rm.split('-').map(Number);
    const n = new Date(y, m, 0).getDate();
    return Array.from({ length: n }, (_, i) => rm + '-' + String(i + 1).padStart(2, '0'));
  })();
  const monthWeeks = [...new Set(monthDays.map(mon))];

  const reportRange =
    rf === 'Daily'
      ? [rdd, rdd]
      : rf === 'Weekly'
      ? [wsR, addD(wsR, 6)]
      : [monthDays[0], monthDays[monthDays.length - 1]];

  const inReportRange = doneTasks.filter(
    (t) => (t.doneAt || t.date) >= reportRange[0] && (t.doneAt || t.date) <= reportRange[1]
  );
  const dDays = (rf === 'Daily' ? [rdd] : rf === 'Weekly' ? wdays : monthDays).filter((d) => d <= TODAY);

  const reportTitle =
    rf === 'Daily'
      ? fmt(rdd)
      : rf === 'Weekly'
      ? fmt(wsR) + ' – ' + fmt(addD(wsR, 6))
      : new Date(rm + '-01T00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const cW = doneTasks.filter((t) => (t.doneAt || t.date) >= wsR && (t.doneAt || t.date) <= addD(wsR, 6)).length;
  const cM = doneTasks.filter(
    (t) => (t.doneAt || t.date) >= monthDays[0] && (t.doneAt || t.date) <= monthDays[monthDays.length - 1]
  ).length;

  const exportReport = () => {
    const data = inReportRange.map((t) => ({
      Employee: empUser.name,
      Task: t.title,
      Client: t.client?.name || 'Personal',
      Service: t.service?.name || '',
      Type: t.type,
      Date: t.doneAt || t.date,
      Time: t.doneTime || t.time,
      Note: t.doneNote || t.desc || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Report');
    saveXLSX(
      wb,
      `buzzrdesk-${empUser.name.toLowerCase()}-report-${rf.toLowerCase()}-${rf === 'Daily' ? rdd : rf === 'Weekly' ? wsR : rm}.xlsx`,
      'Report exported'
    );
  };

  const navHdr = (
    label: string,
    canP: boolean,
    canN: boolean,
    onP: () => void,
    onN: () => void,
    type: string,
    val: string,
    max: string,
    onPick: (v: string) => void
  ) => (
    <V style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <V style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <P
          onPress={canP ? onP : undefined}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: '1px solid ' + BD,
            background: '#fff',
            color: canP ? '#0f172a' : '#cbd5e1',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <I n="back" s={18} />
        </P>
        <P
          onPress={canN ? onN : undefined}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: '1px solid ' + BD,
            background: '#fff',
            color: canN ? '#0f172a' : '#cbd5e1',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ transform: 'rotate(180deg)', display: 'flex' }}>
            <I n="back" s={18} />
          </div>
        </P>
        <div
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 18,
            border: '1px solid ' + BD,
            background: '#fff',
            color: MU,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <I n="cal" s={18} />
          <input
            type={type}
            value={val}
            max={max}
            onChange={(e) => {
              if (e.target.value) onPick(e.target.value);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
            }}
          />
        </div>
      </V>
    </V>
  );

  return (
    <V style={{ gap: 12 }}>
      {/* Back button matching prototype line 410 */}
      <P
        onPress={onBack}
        style={{
          ...R,
          flexDirection: 'row',
          gap: 6,
          color: MU,
          alignSelf: 'flex-start',
          padding: '4px 0',
          cursor: 'pointer',
        }}
      >
        <I n="back" s={18} />
        <span>Back</span>
      </P>

      {/* Header with Avatar, Name, and Role Tag matching prototype line 410 */}
      <V style={{ ...R, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Av n={empUser.name} s={56} url={empUser.avatarUrl} />
        <V style={{ gap: 3 }}>
          <b style={{ fontSize: 19 }}>{empUser.name}</b>
          <span
            style={{
              alignSelf: 'flex-start',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 20,
              color: isAdm ? '#166534' : '#475569',
              background: isAdm ? '#dcfce7' : '#f1f5f9',
            }}
          >
            {isAdm ? 'Management' : 'Employee'}
          </span>
        </V>
      </V>

      {/* 4 Summary KPI Tiles: Open, Overdue, Done, Clients matching prototype line 410 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {tile('Open', openTasks.length, '#1d4ed8', '#dbeafe')}
        {tile(
          'Overdue',
          overdueTasks.length,
          overdueTasks.length ? '#dc2626' : '#15803d',
          overdueTasks.length ? '#fee2e2' : '#dcfce7'
        )}
        {tile('Done', doneTasks.length, '#15803d', '#dcfce7')}
        {tile('Clients', ownedClientsCount, '#7c3aed', '#ede9fe')}
      </div>

      {/* Tab Strip: Tasks & Reports matching prototype line 410 */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid ' + BD, margin: '2px 0 0', background: '#fff' }}>
        {[
          ['tasks', 'task', 'Tasks'],
          ['reports', 'report', 'Reports'],
        ].map(([k, ic, l]) => {
          const on = tab === k;
          return (
            <P
              key={k}
              onPress={() => setTab(k as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '13px 4px 11px',
                borderBottom: on ? '2px solid #17202f' : '2px solid transparent',
                color: on ? '#17202f' : MU,
                fontWeight: on ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <I n={ic} s={21} />
              <span>{l}</span>
            </P>
          );
        })}
      </div>

      {/* Body: Tasks Subview or Reports Subview */}
      {tab === 'tasks' ? (
        <V style={{ gap: 12 }}>
          {/* Header Row: Title / Count / Excel button */}
          {/* Date strip matching prototype line 319 (Above Tabs) */}
          {renderDateStrip(
            wsT,
            setWsT,
            wd,
            (d) => setWd(d),
            (d) =>
              doneTasks.some((t) => (t.doneAt || t.date) === d)
                ? G
                : openTasks.some((t) => t.date === d)
                ? '#f59e0b'
                : 'transparent'
          )}

          {/* Header Row: Title / Count / Excel button */}
          <V style={{ gap: 6 }}>
            <V style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 34 }}>
              <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <b style={{ fontSize: 15 }}>
                  {wd ? fmt(wd) : wt === 'today' ? 'Today' : wt === 'up' ? 'Upcoming' : 'Done earlier'}
                </b>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: 20,
                  }}
                >
                  {cnt}
                </span>
              </V>
              <P
                onPress={exportTasks}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 20,
                  border: '1px solid ' + BD,
                  background: '#fff',
                  color: '#15803d',
                  fontSize: 12.5,
                  fontWeight: 700,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <I n="download" s={15} />
                <span>Excel</span>
              </P>
            </V>

            {/* Filter buttons: Today, Upcoming, Past matching prototype line 330 */}
            <V style={{ flexDirection: 'row', gap: 8 }}>
              {[
                ['today', 'Today', 'cal', tOpen.length],
                ['up', 'Upcoming', 'clock', upTasks.length],
                ['past', 'Past', 'history', pastTasks.length],
              ].map(([k, lb, ic, n]: any) => {
                const on = wt === k && !wd;
                return (
                  <P
                    key={k}
                    title={lb}
                    onPress={() => {
                      setWt(k);
                      setWd('');
                    }}
                    style={{
                      flex: 1,
                      height: 42,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRadius: 12,
                      position: 'relative',
                      background: on ? G : '#fff',
                      color: on ? '#fff' : MU,
                      border: '1px solid ' + (on ? G : BD),
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    <I n={ic} s={18} />
                    <span className="tab-label-desktop">{lb}</span>
                    {n > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -7,
                          right: -3,
                          minWidth: 17,
                          height: 17,
                          padding: '0 4px',
                          borderRadius: 9,
                          background: on ? '#fff' : '#0f172a',
                          color: on ? G : '#fff',
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

          {/* Task list card */}
          <V style={{ ...card, gap: 2 }}>
            {wt === 'up' && !wd ? (
              grp(upTasks, (t) => t.date)
            ) : wt === 'past' && !wd ? (
              grp(pastTasks, (t) => t.doneAt || t.date)
            ) : (
              <V>
                {view.todo.length > 0 && lab('To do', 'task', '#b45309', view.todo.length)}
                {view.todo.map(taskRow)}
                {view.done.length > 0 && lab('Done', 'checks', '#15803d', view.done.length)}
                {view.done.map(taskRow)}
              </V>
            )}

            {!cnt && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 0', color: MU }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <I n="task" s={24} />
                </div>
                <span style={{ textAlign: 'center' }}>
                  {wd
                    ? 'No tasks on this date'
                    : wt === 'today'
                    ? 'Nothing for today'
                    : wt === 'up'
                    ? 'No upcoming tasks'
                    : 'Nothing completed earlier'}
                </span>
              </div>
            )}
          </V>
        </V>
      ) : (
        /* Reports Subview matching prototype lines 331–356 */
        <V style={{ gap: 12 }}>
          {/* Header Row: Title / Count / Excel */}
          <V style={{ gap: 6 }}>
            <V style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 34 }}>
              <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rf === 'Daily' ? reportTitle : rf + ' · ' + reportTitle}
                </b>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: 20,
                    flexShrink: 0,
                  }}
                >
                  {inReportRange.length}
                </span>
              </V>
              <P
                onPress={exportReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 20,
                  border: '1px solid ' + BD,
                  background: '#fff',
                  color: '#15803d',
                  fontSize: 12.5,
                  fontWeight: 700,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <I n="download" s={15} />
                <span>Excel</span>
              </P>
            </V>

            {/* Frequency Selector: Daily, Weekly, Monthly */}
            <V style={{ flexDirection: 'row', gap: 8 }}>
              {[
                ['Daily', 'day', doneTasks.filter((t) => (t.doneAt || t.date) === rdd).length],
                ['Weekly', 'week', cW],
                ['Monthly', 'month', cM],
              ].map(([k, ic, n]: any) => {
                const on = rf === k;
                return (
                  <P
                    key={k}
                    title={k}
                    onPress={() => setRf(k)}
                    style={{
                      width: 68,
                      height: 38,
                      flex: '0 0 68px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 14,
                      position: 'relative',
                      background: on ? G : '#fff',
                      color: on ? '#fff' : MU,
                      border: '1px solid ' + (on ? G : BD),
                      cursor: 'pointer',
                    }}
                  >
                    <I n={ic} s={18} />
                    {n > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -7,
                          right: -3,
                          minWidth: 17,
                          height: 17,
                          padding: '0 4px',
                          borderRadius: 9,
                          background: on ? '#fff' : '#0f172a',
                          color: on ? G : '#fff',
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

          {/* Daily frequency body */}
          {rf === 'Daily' && (
            <V style={{ gap: 12 }}>
              {renderDateStrip(
                wsR,
                setWsR,
                rdd,
                (d) => setRdd(d || TODAY),
                (d) => (doneTasks.some((t) => (t.doneAt || t.date) === d) ? G : 'transparent')
              )}
              <V style={{ ...card, gap: 10 }}>
                <b style={{ fontSize: 15 }}>{fmt(rdd)}</b>
                <span style={{ fontSize: 12, color: MU }}>
                  {inReportRange.length} task{inReportRange.length === 1 ? '' : 's'} completed
                </span>
                {inReportRange.map((t) => (
                  <V
                    key={t.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid ' + BD,
                      borderRadius: 12,
                      padding: 10,
                      gap: 3,
                    }}
                  >
                    <b>{t.title}</b>
                    <span style={{ fontSize: 12, color: MU }}>
                      {t.client?.name || 'Personal'}
                      {t.service?.name ? ' · ' + t.service.name : ''} · {t12(t.doneTime || t.time)}
                    </span>
                    <span style={{ fontSize: 13 }}>{t.doneNote || t.desc || '—'}</span>
                  </V>
                ))}
                {!inReportRange.length && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 0', color: MU }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        background: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <I n="report" s={24} />
                    </div>
                    <span style={{ textAlign: 'center' }}>No completed work on this day</span>
                  </div>
                )}
              </V>
            </V>
          )}

          {/* Weekly frequency body */}
          {rf === 'Weekly' && (
            <V style={{ gap: 12 }}>
              {navHdr(
                wsR === m0 ? 'This week' : 'Week',
                wsR > addD(m0, -7 * 26),
                wsR < m0,
                () => setWsR(addD(wsR, -7)),
                () => setWsR(addD(wsR, 7)),
                'date',
                wsR,
                TODAY,
                (d) => setWsR(mon(d))
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {tile('Tasks done', cW, '#15803d', '#dcfce7')}
                {tile('Active days', dDays.filter((d) => doneTasks.some((t) => (t.doneAt || t.date) === d)).length, '#1d4ed8', '#dbeafe')}
              </div>

              {wdays.map((d) => {
                const tasksOnDay = doneTasks.filter((t) => (t.doneAt || t.date) === d);
                const c2 = tasksOnDay.length;
                const fut = d > TODAY;
                const op = rx === d;

                return (
                  <V key={d} style={{ ...card, padding: 0, opacity: fut ? 0.5 : 1, overflow: 'hidden' }}>
                    <P
                      onPress={fut ? undefined : () => setRx(op ? '' : d)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        cursor: fut ? 'default' : 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 48,
                          borderRadius: 12,
                          background: d === TODAY ? '#dcfce7' : '#f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, color: MU }}>
                          {new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                        <b style={{ fontSize: 17, lineHeight: 1.1 }}>{new Date(d + 'T00:00').getDate()}</b>
                      </div>
                      <V style={{ flex: 1, gap: 3 }}>
                        <b>
                          {c2} task{c2 === 1 ? '' : 's'} completed
                        </b>
                        <span style={{ fontSize: 12, color: MU }}>
                          {c2 === 0 ? 'No work logged' : `${c2} task logged`}
                        </span>
                      </V>
                      <I n={op ? 'up' : 'down'} s={18} />
                    </P>

                    {op && (
                      <V style={{ padding: '0 14px 14px', gap: 6 }}>
                        {tasksOnDay.map((t) => (
                          <V
                            key={t.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid ' + BD,
                              borderRadius: 12,
                              padding: 10,
                              gap: 2,
                            }}
                          >
                            <b>{t.title}</b>
                            <span style={{ fontSize: 12, color: MU }}>
                              {t.client?.name || 'Personal'} · {t12(t.doneTime || t.time)}
                            </span>
                            <span style={{ fontSize: 13 }}>{t.doneNote || t.desc || '—'}</span>
                          </V>
                        ))}
                      </V>
                    )}
                  </V>
                );
              })}
            </V>
          )}

          {/* Monthly frequency body */}
          {rf === 'Monthly' && (
            <V style={{ gap: 12 }}>
              {navHdr(
                reportTitle,
                rm > addD(m0, -366).slice(0, 7),
                rm < TODAY.slice(0, 7),
                () => {
                  const [y, m] = rm.split('-').map(Number);
                  setRm(new Date(y, m - 2, 1).toISOString().slice(0, 7));
                },
                () => {
                  const [y, m] = rm.split('-').map(Number);
                  setRm(new Date(y, m, 1).toISOString().slice(0, 7));
                },
                'month',
                rm,
                TODAY.slice(0, 7),
                (v) => setRm(v)
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {tile('Tasks done', cM, '#15803d', '#dcfce7')}
                {tile('Weeks in month', monthWeeks.length, '#1d4ed8', '#dbeafe')}
              </div>

              {monthWeeks.map((w) => {
                const dd = Array.from({ length: 7 }, (_, i) => addD(w, i)).filter(
                  (x) => x.slice(0, 7) === rm && x <= TODAY
                );
                const n = dd.reduce(
                  (acc, d) => acc + doneTasks.filter((t) => (t.doneAt || t.date) === d).length,
                  0
                );

                return (
                  <P
                    key={w}
                    onPress={() => {
                      setRf('Weekly');
                      setWsR(w);
                      setRx('');
                    }}
                    style={{
                      ...card,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      opacity: dd.length ? 1 : 0.5,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 48,
                        borderRadius: 12,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <I n="week" s={22} />
                    </div>
                    <V style={{ flex: 1, gap: 3 }}>
                      <b>
                        {fmt(w)} – {fmt(addD(w, 6))}
                      </b>
                      <span style={{ fontSize: 12, color: MU }}>
                        {n} task{n === 1 ? '' : 's'} completed
                      </span>
                    </V>
                    <div style={{ display: 'flex', transform: 'rotate(180deg)', color: MU }}>
                      <I n="back" s={18} />
                    </div>
                  </P>
                );
              })}
            </V>
          )}
        </V>
      )}
    </V>
  );
};
