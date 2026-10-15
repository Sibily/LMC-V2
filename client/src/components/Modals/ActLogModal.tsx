import React from 'react';
import { V, Modal, P, B, Av, MU, BD, fmt, t12 } from '../Common';
import { I } from '../Icons';
import { ServiceHistoryItem, Task } from '../../types';

interface ActLogModalProps {
  historyItem: ServiceHistoryItem;
  serviceName: string;
  clientName: string;
  tasks?: Task[];
  onClose: () => void;
  onOpenTaskModal?: (taskId: string) => void;
}

export const ActLogModal: React.FC<ActLogModalProps> = ({
  historyItem,
  serviceName,
  clientName,
  tasks = [],
  onClose,
  onOpenTaskModal,
}) => {
  const acts = historyItem.acts || [];

  return (
    <Modal title="Activity Details" close={onClose}>
      <V style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Av n={historyItem.byUser?.name || 'Team'} s={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 16, color: '#0f172a' }}>{historyItem.stageName}</b>
            <span style={{ fontSize: 12, color: MU, display: 'block' }}>
              {clientName} · {serviceName}
            </span>
          </div>
          <span style={{ fontSize: 12, color: MU }}>
            {historyItem.atDate}
          </span>
        </div>

        {historyItem.note && (
          <div style={{ background: '#f8fafc', border: '1px solid ' + BD, borderRadius: 12, padding: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MU, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
              UPDATE NOTE
            </span>
            <span style={{ fontSize: 13.5, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {historyItem.note}
            </span>
          </div>
        )}

        {acts.length > 0 && (
          <V style={{ gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: MU, textTransform: 'uppercase' }}>
              Linked Tasks & Actions ({acts.length})
            </span>
            {acts.map((act) => (
              <div
                key={act.id}
                onClick={() => act.tid && onOpenTaskModal?.(act.tid)}
                style={{
                  background: '#fff',
                  border: '1px solid ' + BD,
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: act.tid ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: act.kind === 'Reminder' ? '#fce7f3' : '#dcfce7',
                      color: act.kind === 'Reminder' ? '#db2777' : '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <I n={act.kind === 'Reminder' ? 'bell' : 'checks'} s={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>{act.title}</b>
                    {act.body && <span style={{ fontSize: 11.5, color: MU }}>{act.body}</span>}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 11.5, color: MU, display: 'block' }}>{act.who}</span>
                  {act.time && <span style={{ fontSize: 11, color: MU }}>{act.time}</span>}
                </div>
              </div>
            ))}
          </V>
        )}

        <B onPress={onClose} style={{ marginTop: 6 }}>
          Close
        </B>
      </V>
    </Modal>
  );
};
