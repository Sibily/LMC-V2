import React from 'react';
import { V, R, P, B, IB, Av, card, G, MU, BD } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';

export const TeamPage: React.FC<{
  team: any[];
  tasks: Task[];
  onOpenModal: (type: string, data?: any) => void;
}> = ({ team, tasks, onOpenModal }) => {
  const { user } = useAuth();

  return (
    <V style={{ gap: 12 }}>
      <V style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <b style={{ fontSize: 18 }}>All Employees ({team.length})</b>
        <B k={1} onPress={() => onOpenModal('emp')}>
          <I n="plus" s={16} />Add Employee
        </B>
      </V>

      <V style={card}>
        {team.map((u) => {
          const userTasks = tasks.filter((t) => t.whoUserId === u.id);
          const todo = userTasks.filter((t) => !t.done).length;
          const done = userTasks.filter((t) => t.done).length;

          return (
            <V key={u.id} style={{ ...R, flexDirection: 'row', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <Av n={u.name} s={46} url={u.avatarUrl} />
              <V style={{ flex: 1, gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b>{u.name}</b>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      color: u.role === 'management' ? '#166534' : '#475569',
                      background: u.role === 'management' ? '#dcfce7' : '#f1f5f9',
                    }}
                  >
                    {u.role === 'management' ? 'Management' : 'Employee'}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: MU }}>{u.email}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 20 }}>
                    To do {todo}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>
                    Done {done}
                  </span>
                </div>
              </V>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IB
                  n="lock"
                  title="Edit credentials"
                  onPress={() => onOpenModal('cred', { member: u })}
                />
                <IB n="edit" title="Edit profile" onPress={() => onOpenModal('emp', u)} />
              </div>
            </V>
          );
        })}
      </V>
    </V>
  );
};
