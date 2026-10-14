import React, { useState } from 'react';
import { V, R, P, B, inp, card, G, MU, BD, STAT, scol, EmptyState } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';

interface ClientsProps {
  clients: Client[];
  team: any[];
  onOpenClient: (id: string) => void;
  onOpenModal: (type: string, data?: any) => void;
}

export const Clients: React.FC<ClientsProps> = ({ clients, team, onOpenClient, onOpenModal }) => {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'My Clients' | 'All Clients'>('All Clients');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = clients.filter((k) => {
    const isMine = k.ownerId === user?.id || (k.members || []).some((m) => m.userId === user?.id);
    if (tab === 'My Clients' && !isMine) return false;
    if (statusFilter && k.status !== statusFilter) return false;

    const query = q.toLowerCase().trim();
    if (!query) return true;
    const matchName = k.name.toLowerCase().includes(query);
    const matchCompany = k.company.toLowerCase().includes(query);
    const matchPhone = k.phone.includes(query);
    return matchName || matchCompany || matchPhone;
  });

  return (
    <V style={{ gap: 12 }}>
      {/* Header */}
      <V style={{ flexDirection: 'row', justifyContent: 'space-between', ...R }}>
        <b style={{ fontSize: 18 }}>Clients ({filtered.length})</b>
        <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <B title="Edit default pipeline" onPress={() => onOpenModal('custPipeline', { isDefault: true })} style={{ padding: '10px 12px' }}>
            <I n="cog" s={16} />Pipeline
          </B>
          <B k={1} onPress={() => onOpenModal('client')}>
            <I n="plus" s={16} />Add Client
          </B>
        </V>
      </V>

      {/* Tabs */}
      <V style={{ flexDirection: 'row', gap: 8 }}>
        {(['My Clients', 'All Clients'] as const).map((x) => (
          <B key={x} k={tab === x} onPress={() => setTab(x)}>
            {x}
          </B>
        ))}
      </V>

      {/* Search & Status filter pills */}
      <V style={{ flexDirection: 'row', gap: 8 }}>
        <input style={{ ...inp, flex: 1 }} placeholder="Search clients by name, company, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </V>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <P
          onPress={() => setStatusFilter('')}
          style={{
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid ' + (!statusFilter ? G : BD),
            background: !statusFilter ? '#f0fdf4' : '#fff',
            color: !statusFilter ? G : MU,
          }}
        >
          All
        </P>
        {Object.keys(STAT).map((s) => (
          <P
            key={s}
            onPress={() => setStatusFilter(statusFilter === s ? '' : s)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid ' + (statusFilter === s ? STAT[s] : BD),
              background: statusFilter === s ? STAT[s] + '18' : '#fff',
              color: statusFilter === s ? STAT[s] : MU,
            }}
          >
            {s}
          </P>
        ))}
      </div>

      {/* Clients list */}
      {filtered.map((k) => {
        const activeService = (k.services || []).find((s) => {
          const curStage = (s.stagesConfig as any[]).find((st) => st.id === s.curStageId);
          return curStage?.name?.toLowerCase() !== 'completed';
        }) || (k.services || [])[0];

        const curStageName = activeService
          ? (activeService.stagesConfig as any[]).find((st) => st.id === activeService.curStageId)?.name || 'Enquiry'
          : null;

        const isOwner = k.ownerId === user?.id;
        const member = (k.members || []).find((m) => m.userId === user?.id);
        const access = isOwner ? 'Owner' : member?.permission || '—';

        return (
          <P
            key={k.id}
            onPress={() => onOpenClient(k.id)}
            style={{
              ...card,
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <V style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <V>
                <b>{k.name}</b>
                <span style={{ color: MU, fontSize: 12 }}>{k.company || k.type}</span>
              </V>
              <span style={{ fontSize: 12, fontWeight: 700, color: STAT[k.status] || MU, flexShrink: 0 }}>
                {k.status}
              </span>
            </V>

            <span style={{ fontSize: 12, color: MU }}>
              {activeService ? (
                <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: G,
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      borderRadius: 8,
                      padding: '4px 8px',
                    }}
                  >
                    {activeService.name} · {curStageName}
                  </span>
                  {(k.services || []).length > 1 && (
                    <span style={{ fontSize: 12, color: MU }}>+{(k.services || []).length - 1} more</span>
                  )}
                </V>
              ) : (
                <span>No services</span>
              )}
            </span>

            <span style={{ fontSize: 12, color: MU }}>
              Owner: {k.owner?.name || 'Unassigned'} · Access: {access}
            </span>
          </P>
        );
      })}

      {!filtered.length && (
        <EmptyState
          icon={q || statusFilter ? 'search' : 'users'}
          title={
            q || statusFilter
              ? 'No matching clients found'
              : tab === 'My Clients'
              ? 'No clients assigned to you'
              : 'No clients yet'
          }
          desc={
            q || statusFilter
              ? 'Try clearing your search query or status filter to see all clients.'
              : tab === 'My Clients'
              ? 'You do not own or participate in any clients yet. Switch to All Clients or create a new client.'
              : 'Add your first client to start tracking their pipeline, services, and tasks.'
          }
          actionLabel={
            q || statusFilter
              ? 'Clear Filters'
              : tab === 'My Clients'
              ? 'View All Clients'
              : '+ Add Client'
          }
          onAction={() => {
            if (q || statusFilter) {
              setQ('');
              setStatusFilter('');
            } else if (tab === 'My Clients') {
              setTab('All Clients');
            } else {
              onOpenModal('client');
            }
          }}
        />
      )}
    </V>
  );
};
