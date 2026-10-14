import React, { useState } from 'react';
import { V, R, P, B, card, G, MU, BD, TODAY, add, fmt, t12, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { Note } from '../types';

export const NotesPage: React.FC<{
  notes: Note[];
  onOpenModal: (type: string, data?: any) => void;
}> = ({ notes, onOpenModal }) => {
  const [tab, setTab] = useState<'today' | 'past' | 'all'>('all');

  const filtered = notes.filter((n) => {
    const d = n.createdAt ? n.createdAt.slice(0, 10) : TODAY;
    if (tab === 'today') return d === TODAY;
    if (tab === 'past') return d < TODAY;
    return true;
  });

  return (
    <V style={{ gap: 12 }}>
      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 18 }}>Notes ({filtered.length})</b>
        <B k={1} onPress={() => onOpenModal('note')}>
          <I n="plus" s={16} />Add Note
        </B>
      </V>

      {/* Tabs */}
      <V style={{ flexDirection: 'row', gap: 6 }}>
        {[
          ['today', 'Today', 'cal'],
          ['past', 'Past', 'history'],
          ['all', 'All Notes', 'note'],
        ].map(([k, l, ic]) => (
          <P
            key={k}
            onPress={() => setTab(k as any)}
            style={{
              flex: 1,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: 14,
              border: '1px solid ' + (tab === k ? G : BD),
              background: tab === k ? G : '#fff',
              color: tab === k ? '#fff' : MU,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <I n={ic} s={16} />
            {l}
          </P>
        ))}
      </V>

      {/* Notes List */}
      <V style={card}>
        {filtered.map((n) => (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{n.title || 'Note'}</b>
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
                }}
              >
                <I n="clock" s={11} />
                {t12(n.createdAt ? new Date(n.createdAt).toTimeString().slice(0, 5) : '09:00')}
              </span>
            </div>
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
            <span style={{ fontSize: 11, color: MU }}>
              {n.client?.name ? n.client.name + ' · ' : 'Personal · '}
              {n.createdAt ? fmt(n.createdAt.slice(0, 10)) : ''}
            </span>
          </P>
        ))}
        {!filtered.length && (
          <EmptyState
            icon="note"
            title="No notes found"
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
