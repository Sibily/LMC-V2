import React, { useState } from 'react';
import { V, R, P, B, inp, card, G, MU, BD, STAT, scol, EmptyState, Modal, F } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { api } from '../api/client';

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
  const [deletedClients, setDeletedClients] = useState<Client[]>([]);
  const [deletedOpen, setDeletedOpen] = useState(false);

  React.useEffect(() => {
    if (user?.role === 'management') {
      api.clients.listDeleted().then(setDeletedClients).catch(() => {});
    }
  }, [user]);

  const [serviceFilter, setServiceFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Available services collected from client services
  const availableServices = Array.from(
    new Set(
      clients.flatMap((k) => (k.services || []).map((s) => s.name)).filter(Boolean)
    )
  ).sort();

  const activeFilterCount = [statusFilter, serviceFilter, ownerFilter].filter(Boolean).length;

  const filtered = clients.filter((k) => {
    const isMine = k.ownerId === user?.id || (k.members || []).some((m) => m.userId === user?.id);
    if (tab === 'My Clients' && !isMine) return false;
    if (statusFilter && k.status !== statusFilter) return false;
    if (serviceFilter && !(k.services || []).some((s) => s.name === serviceFilter)) return false;
    if (ownerFilter && k.ownerId !== ownerFilter) return false;

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

      {/* Search & Filter button */}
      <V style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <input
          style={{ ...inp, flex: 1 }}
          placeholder="Search clients by name, company, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <B
          k={activeFilterCount > 0}
          onPress={() => setFilterModalOpen(true)}
          style={{
            padding: '0 14px',
            height: 42,
            gap: 6,
            flexShrink: 0,
            borderRadius: 10,
          }}
        >
          <I n="filter" s={16} />
          <span>{activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}</span>
        </B>
      </V>

      {/* Quick Status filter pills with active filters info */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, alignItems: 'center' }}>
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
            flexShrink: 0,
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
              flexShrink: 0,
            }}
          >
            {s}
          </P>
        ))}
        {serviceFilter && (
          <P
            onPress={() => setServiceFilter('')}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid ' + G,
              background: '#f0fdf4',
              color: G,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span>Service: {serviceFilter}</span>
            <I n="x" s={12} />
          </P>
        )}
        {ownerFilter && (
          <P
            onPress={() => setOwnerFilter('')}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid ' + G,
              background: '#f0fdf4',
              color: G,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span>Owner: {team.find((u) => u.id === ownerFilter)?.name || ownerFilter}</span>
            <I n="x" s={12} />
          </P>
        )}
        {activeFilterCount > 0 && (
          <P
            onPress={() => {
              setStatusFilter('');
              setServiceFilter('');
              setOwnerFilter('');
            }}
            style={{
              padding: '5px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            Clear all
          </P>
        )}
      </div>

      {/* Filter Modal */}
      {filterModalOpen && (
        <Modal title="Filter clients" close={() => setFilterModalOpen(false)}>
          <V style={{ gap: 16 }}>
            {/* Status Section */}
            <F l="Status">
              <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <P
                  onPress={() => setStatusFilter('')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 13,
                    border: '1px solid ' + (!statusFilter ? G : BD),
                    background: !statusFilter ? '#f0fdf4' : '#fff',
                    color: !statusFilter ? G : MU,
                  }}
                >
                  Any
                </P>
                {Object.keys(STAT).map((s) => {
                  const on = statusFilter === s;
                  return (
                    <P
                      key={s}
                      onPress={() => setStatusFilter(on ? '' : s)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 20,
                        fontWeight: 600,
                        fontSize: 13,
                        border: '1px solid ' + (on ? STAT[s] : BD),
                        background: on ? STAT[s] + '18' : '#fff',
                        color: on ? STAT[s] : MU,
                      }}
                    >
                      {s}
                    </P>
                  );
                })}
              </div>
            </F>

            {/* Service Section */}
            {availableServices.length > 0 && (
              <F l="Service">
                <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap', maxHeight: 180, overflowY: 'auto', padding: '2px 0' }}>
                  <P
                    onPress={() => setServiceFilter('')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      fontWeight: 600,
                      fontSize: 13,
                      border: '1px solid ' + (!serviceFilter ? G : BD),
                      background: !serviceFilter ? '#f0fdf4' : '#fff',
                      color: !serviceFilter ? G : MU,
                    }}
                  >
                    Any
                  </P>
                  {availableServices.map((sv) => {
                    const on = serviceFilter === sv;
                    return (
                      <P
                        key={sv}
                        onPress={() => setServiceFilter(on ? '' : sv)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 20,
                          fontWeight: 600,
                          fontSize: 13,
                          border: '1px solid ' + (on ? G : BD),
                          background: on ? '#f0fdf4' : '#fff',
                          color: on ? G : MU,
                        }}
                      >
                        {sv}
                      </P>
                    );
                  })}
                </div>
              </F>
            )}

            {/* Owner Section */}
            {team.length > 0 && (
              <F l="Owner">
                <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <P
                    onPress={() => setOwnerFilter('')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      fontWeight: 600,
                      fontSize: 13,
                      border: '1px solid ' + (!ownerFilter ? G : BD),
                      background: !ownerFilter ? '#f0fdf4' : '#fff',
                      color: !ownerFilter ? G : MU,
                    }}
                  >
                    Any
                  </P>
                  {team.map((u) => {
                    const on = ownerFilter === u.id;
                    return (
                      <P
                        key={u.id}
                        onPress={() => setOwnerFilter(on ? '' : u.id)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 20,
                          fontWeight: 600,
                          fontSize: 13,
                          border: '1px solid ' + (on ? G : BD),
                          background: on ? '#f0fdf4' : '#fff',
                          color: on ? G : MU,
                        }}
                      >
                        {u.name}{u.id === user?.id ? ' (me)' : ''}
                      </P>
                    );
                  })}
                </div>
              </F>
            )}

            {/* Modal Actions */}
            <V style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <B
                style={{ flex: 1 }}
                onPress={() => {
                  setStatusFilter('');
                  setServiceFilter('');
                  setOwnerFilter('');
                }}
              >
                Clear all
              </B>
              <B k={1} style={{ flex: 1 }} onPress={() => setFilterModalOpen(false)}>
                Done
              </B>
            </V>
          </V>
        </Modal>
      )}

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

      {/* Recently Deleted Clients Accordion (Management Only) */}
      {user?.role === 'management' && (
        <V style={{ ...card, gap: 10, marginTop: 6 }}>
          <P
            onPress={() => setDeletedOpen(!deletedOpen)}
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: 0,
              background: 'transparent',
              color: '#0f172a',
            }}
          >
            <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <div style={{ color: '#dc2626' }}>
                <I n="trash" s={18} />
              </div>
              <b style={{ fontSize: 14 }}>Recently deleted clients</b>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: '#f1f5f9',
                  color: '#475569',
                }}
              >
                {deletedClients.length}
              </span>
            </V>
            <I n={deletedOpen ? 'up' : 'down'} s={16} />
          </P>

          {deletedOpen && (
            <V style={{ gap: 8, paddingTop: 4 }}>
              {deletedClients.length === 0 ? (
                <span style={{ fontSize: 13, color: MU, padding: '8px 0' }}>No recently deleted clients.</span>
              ) : (
                deletedClients.map((k) => (
                  <P
                    key={k.id}
                    onPress={() => onOpenModal('deletedClientProfile', { client: k })}
                    style={{
                      border: '1px solid #fee2e2',
                      background: '#fff5f5',
                      borderRadius: 12,
                      padding: '10px 14px',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div>
                      <b style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{k.name}</b>
                      <span style={{ fontSize: 12, color: MU }}>
                        {k.company || k.type} · Deleted {k.deletedAt ? k.deletedAt.slice(0, 10) : ''}
                      </span>
                    </div>
                    <B
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        background: '#fff',
                        borderColor: '#fca5a5',
                        color: '#dc2626',
                      }}
                      onPress={() => onOpenModal('deletedClientProfile', { client: k })}
                    >
                      View & Restore
                    </B>
                  </P>
                ))
              )}
            </V>
          )}
        </V>
      )}

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
