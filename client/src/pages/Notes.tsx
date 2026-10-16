import React, { useState } from 'react';
import { V, R, P, B, card, G, MU, BD, TODAY, add, fmt, lbl, t12, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Note } from '../types';

export const NotesPage: React.FC<{
  notes: Note[];
  onOpenModal: (type: string, data?: any) => void;
  onNavigate?: (page: string) => void;
}> = ({ notes, onOpenModal, onNavigate }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'today' | 'past' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const dk = (n: Note) => (n.createdAt ? n.createdAt.slice(0, 10) : TODAY);
  const srt = (a: Note, b: Note) => (b.createdAt || '').localeCompare(a.createdAt || '');

  // Scope to notes for current user or general notes
  const allNotes = notes.filter((n) => {
    return true;
  });

  const sets = {
    today: allNotes.filter((n) => dk(n) === TODAY).sort(srt),
    past: allNotes.filter((n) => dk(n) < TODAY).sort(srt),
    all: [...allNotes].sort(srt),
  };

  const list = selectedDate
    ? allNotes.filter((n) => dk(n) === selectedDate).sort(srt)
    : sets[tab];

  const dateGroups = Array.from(new Set(list.map(dk)));
  // 14 days up to today: add(-13) to add(0)
  const days = Array.from({ length: 14 }, (_, i) => add(i - 13));

  const tabMeta: [keyof typeof sets, string, string][] = [
    ['today', 'Today', 'cal'],
    ['past', 'Past', 'history'],
    ['all', 'All Notes', 'note'],
  ];

  const nm: Record<string, string> = {
    today: 'Today',
    past: 'Earlier notes',
    all: 'All notes',
  };

  const em: Record<string, string> = {
    today: 'No notes today',
    past: 'No earlier notes',
    all: 'No notes yet',
  };

  const nRow = (n: Note) => (
    <P
      key={n.id}
      onPress={() => onOpenModal('note', n)}
      style={{
        flexDirection: 'column',
        gap: 6,
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
      }}
    >
      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {n.title || 'Note'}
        </b>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: '#0369a1',
            background: '#e0f2fe',
            padding: '3px 8px',
            borderRadius: 20,
            flexShrink: 0,
          }}
        >
          <I n="clock" s={11} />
          {t12(n.createdAt ? new Date(n.createdAt).toTimeString().slice(0, 5) : '09:00')}
        </span>
      </V>

      {n.byUser?.name && n.byUserId !== user?.id && (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
          Sent by {n.byUser.name}
        </span>
      )}

      {n.body && (
        <span
          style={{
            fontSize: 13.5,
            color: MU,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}
        >
          {n.body}
        </span>
      )}

      <span
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: n.client?.name ? '#1d4ed8' : MU,
          background: n.client?.name ? '#dbeafe' : '#f1f5f9',
          padding: '2px 8px',
          borderRadius: 20,
        }}
      >
        <I n={n.client?.name ? 'users' : 'user'} s={11} />
        {n.client?.name || 'Personal'}
      </span>
    </P>
  );

  return (
    <V style={{ gap: 12 }}>
      {/* Back button & Title Header */}
      {onNavigate && (
        <P onPress={() => onNavigate('home')} style={{ ...R, gap: 6, color: MU, cursor: 'pointer' }}>
          <I n="back" s={18} />Back
        </P>
      )}

      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 20 }}>Notes</b>
        <B k={1} onPress={() => onOpenModal('note')}>
          <I n="plus" s={16} />Add
        </B>
      </V>

      {/* Tabs with badge counts */}
      {/* 14-day date scrubber + Calendar picker (Above Tabs) */}
      <V style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <div
          ref={(el) => {
            if (el && !el.dataset.init) {
              el.dataset.init = '1';
              el.scrollLeft = el.scrollWidth;
            }
          }}
          style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0, padding: '2px 0' }}
        >
          {days.map((d) => {
            const on = selectedDate === d;
            const dt = new Date(d + 'T00:00');
            const has = allNotes.some((n) => dk(n) === d);
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
                    background: has ? (on ? '#fff' : '#0284c7') : 'transparent',
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
            border: '1px solid ' + (selectedDate && !days.includes(selectedDate) ? G : BD),
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

      {/* Tab Header with Count Badge & Tabs */}
      <V style={{ gap: 6 }}>
        <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <b style={{ fontSize: 15 }}>{selectedDate ? fmt(selectedDate) : nm[tab]}</b>
          <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
            {list.length}
          </span>
        </V>

        {/* Tabs: Icons on Mobile, Visible Labels on Desktop */}
        <V style={{ flexDirection: 'row', gap: 8 }}>
          {tabMeta.map(([k, lb, ic]) => {
            const on = tab === k && !selectedDate;
            const n = sets[k].length;
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
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 14,
                  position: 'relative',
                  background: on ? G : '#fff',
                  color: on ? '#fff' : MU,
                  border: '1px solid ' + (on ? G : BD),
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
                      top: -6,
                      right: -4,
                      minWidth: 18,
                      height: 18,
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

      {/* Notes List grouped by date */}
      <V style={card}>
        {dateGroups.map((d) => (
          <V key={d}>
            {(tab !== 'today' || selectedDate) && (
              <V style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, color: MU }}>
                <I n="cal" s={13} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{lbl(d)}</span>
              </V>
            )}
            {list.filter((n) => dk(n) === d).map(nRow)}
          </V>
        ))}

        {!list.length && (
          <EmptyState
            icon="note"
            title={selectedDate ? 'No notes on this date' : em[tab]}
            desc="Keep track of client requirements, meeting takeaways, and internal thoughts."
            actionLabel="+ Add Note"
            onAction={() => onOpenModal('note')}
            color="#0ea5e9"
          />
        )}
      </V>
    </V>
  );
};
