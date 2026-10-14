import React, { useState } from 'react';
import { V, R, P, B, IB, Av, card, Pipe, G, MU, BD, STAT, fmt, ago, t12 } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Client, Service, Communication, Task } from '../types';
import { api } from '../api/client';

interface ClientDetailProps {
  client: Client;
  tasks: Task[];
  team: any[];
  onBack: () => void;
  onRefreshClient: () => void;
  onOpenModal: (type: string, data?: any) => void;
}

export const ClientDetail: React.FC<ClientDetailProps> = ({
  client,
  tasks,
  team,
  onBack,
  onRefreshClient,
  onOpenModal,
}) => {
  const { user, toast } = useAuth();
  const [tab, setTab] = useState<'Overview' | 'Services' | 'Contact' | 'Documents' | 'Quotations' | 'Communication' | 'Activity'>('Overview');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const services = client.services || [];
  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];
  const clientTasks = tasks.filter((t) => t.clientId === client.id);
  const clientReminders = clientTasks.filter((t) => t.type === 'Reminder' && !t.done);

  const tabs = ['Overview', 'Services', 'Contact', 'Documents', 'Quotations', 'Communication', 'Activity'] as const;
  const TI: Record<string, string> = {
    Overview: 'home',
    Services: 'task',
    Contact: 'phone',
    Documents: 'report',
    Quotations: 'inbox',
    Communication: 'chat',
    Activity: 'clock',
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await api.clients.update(client.id, { status: newStatus });
      setStatusMenuOpen(false);
      onRefreshClient();
      toast(`Status updated to ${newStatus}`);
    } catch (e: any) {
      toast('Failed to update status');
    }
  };

  const curStageName = activeService
    ? (activeService.stagesConfig as any[]).find((st) => st.id === activeService.curStageId)?.name || 'Enquiry'
    : 'No services';

  const pendingDecisionIndex = activeService
    ? (activeService.stagesConfig as any[]).findIndex((s) => s.type === 'decision' && s.res !== 'yes')
    : -1;

  const decisionStage = pendingDecisionIndex >= 0 ? (activeService?.stagesConfig as any[])[pendingDecisionIndex] : null;

  return (
    <V style={{ gap: 12 }}>
      {/* Top Bar */}
      <V style={{ ...R, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <P onPress={onBack} style={{ ...R, gap: 6, color: MU }}>
          <I n="back" s={18} />Back
        </P>
        <V style={{ ...R, flexDirection: 'row', gap: 6 }}>
          <V style={{ flexDirection: 'row', marginRight: 4 }}>
            <Av n={client.owner?.name || 'Owner'} url={client.owner?.avatarUrl} />
            {(client.members || []).map((p) => (
              <Av key={p.userId} n={p.user?.name || 'Member'} url={p.user?.avatarUrl} o={true} />
            ))}
          </V>
          <B onPress={() => onOpenModal('people', { client })} style={{ padding: '7px 10px' }}>
            <I n="adduser" s={16} />Add People
          </B>
          <IB n="edit" onPress={() => onOpenModal('client', client)} />
        </V>
      </V>

      {/* Profile Header */}
      <V style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
        <V style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
          <Av n={client.name} s={52} />
          <V style={{ flex: 1, gap: 1 }}>
            <b style={{ fontSize: 19 }}>{client.name}</b>
            <span style={{ fontSize: 12, color: MU }}>
              {[client.company || client.type, client.loc].filter(Boolean).join(' · ')}
            </span>
          </V>

          {/* Action circles: Call & WhatsApp */}
          <a
            href={client.phone ? `tel:${client.phone}` : undefined}
            onClick={client.phone ? undefined : () => onOpenModal('client', client)}
            title={client.phone ? 'Call' : 'Add phone'}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              opacity: client.phone ? 1 : 0.45,
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 21, background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I n="phone" s={20} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: MU }}>Call</span>
          </a>

          <a
            href={client.phone ? `https://wa.me/${String(client.phone).replace(/[^0-9]/g, '')}` : undefined}
            target={client.phone ? '_blank' : undefined}
            rel="noreferrer"
            onClick={client.phone ? undefined : () => onOpenModal('client', client)}
            title={client.phone ? 'WhatsApp' : 'Add phone'}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              opacity: client.phone ? 1 : 0.45,
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 21, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I n="chat" s={20} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: MU }}>WhatsApp</span>
          </a>

          <P
            title="Add service"
            onPress={() => onOpenModal('svc', { clientId: client.id })}
            style={{ flexDirection: 'column', alignItems: 'center', gap: 3 }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 21, background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I n="plus" s={20} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: MU }}>Service</span>
          </P>
        </V>

        {/* Status Dropdown Tag */}
        <P
          onPress={() => setStatusMenuOpen(!statusMenuOpen)}
          style={{
            ...R,
            gap: 4,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: (STAT[client.status] || '#64748b') + '1a',
            color: STAT[client.status] || '#64748b',
          }}
        >
          {client.status}
          <I n="down" s={14} />
        </P>

        {statusMenuOpen && (
          <V style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, ...card, padding: 6, boxShadow: '0 8px 24px #0002' }}>
            {Object.keys(STAT).map((s) => (
              <P key={s} onPress={() => updateStatus(s)} style={{ ...R, gap: 8, padding: '8px 12px', fontWeight: 600, color: STAT[s] }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: STAT[s] }} />
                {s}
              </P>
            ))}
          </V>
        )}
      </V>

      {/* Tabs Row */}
      <V style={{ flexDirection: 'row', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map((t) => (
          <P
            key={t}
            onPress={() => setTab(t)}
            style={{
              padding: '8px 12px',
              borderRadius: 20,
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: 'nowrap',
              background: tab === t ? G : '#fff',
              color: tab === t ? '#fff' : MU,
              border: '1px solid ' + (tab === t ? G : BD),
            }}
          >
            {t}
          </P>
        ))}
      </V>

      {/* TAB: Overview */}
      {tab === 'Overview' &&
        (activeService ? (
          <V style={{ gap: 12 }}>
            {decisionStage && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: '#fef3c7',
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <I n="alert" s={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 15, color: '#92400e', display: 'block' }}>
                      Decision Required: {decisionStage.name}
                    </b>
                    <span style={{ fontSize: 12, color: '#b45309' }}>
                      Client approval or decision is pending for {activeService.name}.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <B
                    k={1}
                    onPress={() => onOpenModal('decide', { client, service: activeService, decisionStageId: decisionStage.id })}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      background: '#16a34a',
                      borderColor: '#16a34a',
                      color: '#fff',
                      justifyContent: 'center',
                    }}
                  >
                    <I n="tick" s={16} />
                    {decisionStage.yes} (Proceed)
                  </B>
                  <B
                    onPress={() => onOpenModal('decide', { client, service: activeService, decisionStageId: decisionStage.id })}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      background: '#fff',
                      borderColor: '#fca5a5',
                      color: '#dc2626',
                      justifyContent: 'center',
                    }}
                  >
                    <I n="x" s={16} />
                    {decisionStage.no} (Decline)
                  </B>
                </div>
              </div>
            )}

            <V style={{ ...card, gap: 12 }}>
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 7, color: G, background: '#dcfce7', padding: '6px 14px 6px 10px', borderRadius: 20 }}>
                <I n="building" s={16} />
                <b style={{ fontSize: 15 }}>Client Stage</b>
              </div>

              <V style={{ gap: 8 }}>
                <V>
                  <b>{activeService.name}</b>
                  <span style={{ fontSize: 12, color: MU }}>{curStageName}</span>
                </V>

                {/* Service pills */}
                <V style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {services.map((s) => {
                    const on = s.id === activeService.id;
                    return (
                      <P
                        key={s.id}
                        onPress={() => setSelectedServiceId(s.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 14,
                          fontWeight: 700,
                          fontSize: 13,
                          background: on ? G : '#f1f5f9',
                          color: on ? '#fff' : MU,
                          border: '1px solid ' + (on ? G : BD),
                        }}
                      >
                        {s.name}
                      </P>
                    );
                  })}
                  <P
                    title="Add service"
                    onPress={() => onOpenModal('svc', { clientId: client.id })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 14,
                      background: '#fff',
                      color: MU,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <I n="plus" s={16} />
                  </P>
                </V>
              </V>

              <Pipe
                st={activeService.stagesConfig as any[]}
                cur={activeService.curStageId}
                pick={(s) => {
                  if (s.type === 'decision') {
                    onOpenModal('decide', { client, service: activeService, decisionStageId: s.id });
                  } else {
                    onOpenModal('stage', { client, service: activeService, stageId: s.id });
                  }
                }}
              />
            </V>

            {/* Stage Details */}
            <V style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <I n="receipt" s={18} />
                <b>Stage Details</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: MU }}>Stage</span>
                <b>{curStageName}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: MU }}>Responsible</span>
                <b>{activeService.responsibleUser?.name || 'Unassigned'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: MU }}>Next Action</span>
                <b>{activeService.nextAction || '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: MU }}>Last update</span>
                <b>{activeService.updDate ? fmt(activeService.updDate) + ' · ' + ago(activeService.updDate) : '—'}</b>
              </div>

              {/* Advance to Next Stage Button */}
              {(() => {
                const currentStages = (activeService?.stagesConfig as any[]) || [];
                const curIdx = currentStages.findIndex((s) => s.id === activeService?.curStageId);
                const nxt = curIdx >= 0 && curIdx < currentStages.length - 1 ? currentStages[curIdx + 1] : null;

                if (nxt) {
                  return (
                    <B
                      k={1}
                      onPress={() => {
                        if (nxt.type === 'decision') {
                          onOpenModal('decide', { client, service: activeService, decisionStageId: nxt.id });
                        } else {
                          onOpenModal('stage', { client, service: activeService, stageId: nxt.id });
                        }
                      }}
                      style={{
                        marginTop: 10,
                        padding: '11px 16px',
                        justifyContent: 'center',
                        fontSize: 14,
                        boxShadow: '0 2px 8px #16a34a33',
                      }}
                    >
                      Advance to: {nxt.name} →
                    </B>
                  );
                }
                return (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <I n="tick" s={16} /> All Service Stages Completed
                  </div>
                );
              })()}
            </V>

            {/* Quick Actions */}
            <V style={{ ...card, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <I n="edit" s={18} />
                <b>Quick Actions</b>
              </div>
              <V style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <B k={1} onPress={() => onOpenModal('stage', { client, service: activeService })}>
                  <I n="edit" s={16} />Update Stage
                </B>
                {decisionStage && (
                  <B
                    onPress={() => onOpenModal('decide', { client, service: activeService, decisionStageId: decisionStage.id })}
                    style={{ borderColor: '#16a34a', color: '#166534', background: '#f0fdf4' }}
                  >
                    <I n="tick" s={16} />
                    {decisionStage.yes} / {decisionStage.no}
                  </B>
                )}
                <B onPress={() => onOpenModal('reminder', { clientId: client.id, serviceId: activeService.id })}>
                  <I n="bell" s={16} />Reminder
                </B>
                <B onPress={() => onOpenModal('task', { clientId: client.id })}>
                  <I n="task" s={16} />Task
                </B>
              </V>
            </V>

            {/* Reminders Card */}
            <V style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I n="bell" s={18} />
                  <b>Reminders</b>
                </div>
                <span style={{ background: '#f1f5f9', color: MU, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
                  {clientReminders.length}
                </span>
              </div>
              {clientReminders.length ? (
                clientReminders.map((t) => (
                  <V key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <b>{t.title}</b>
                    <span style={{ fontSize: 12, color: MU }}>
                      {fmt(t.date)} · {t12(t.time)}
                    </span>
                  </V>
                ))
              ) : (
                <span style={{ color: MU, padding: '10px 0' }}>No reminders for this client.</span>
              )}
            </V>
          </V>
        ) : (
          <span style={{ color: MU, padding: '24px 0', textAlign: 'center' }}>No services yet. Add one with + Service.</span>
        ))}

      {/* TAB: Services */}
      {tab === 'Services' && (
        <V style={{ gap: 10 }}>
          <V style={{ ...R, flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>Services ({services.length})</b>
            <V style={{ flexDirection: 'row', gap: 8 }}>
              <B onPress={() => onOpenModal('custPipeline', { isDefault: true })}>
                <I n="cog" s={16} />Pipeline Settings
              </B>
              <B k={1} onPress={() => onOpenModal('svc', { clientId: client.id })}>
                <I n="plus" s={16} />Add Service
              </B>
            </V>
          </V>

          {services.map((s) => (
            <V key={s.id} style={{ ...card, gap: 8 }}>
              <V style={{ flexDirection: 'row', justifyContent: 'space-between', ...R }}>
                <b>{s.name}</b>
                <V style={{ flexDirection: 'row', gap: 4 }}>
                  <B onPress={() => onOpenModal('custPipeline', { service: s })}>
                    <I n="cog" s={16} />Customize
                  </B>
                  <B k={1} onPress={() => onOpenModal('stage', { client, service: s })}>
                    <I n="edit" s={16} />Update
                  </B>
                </V>
              </V>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, fontSize: 12 }}>
                <V>
                  <span style={{ color: MU }}>Responsible</span>
                  <b>{s.responsibleUser?.name || 'Unassigned'}</b>
                </V>
                <V>
                  <span style={{ color: MU }}>Next Action</span>
                  <b>{s.nextAction || '—'}</b>
                </V>
                <V>
                  <span style={{ color: MU }}>Last Update</span>
                  <b>{s.updDate ? fmt(s.updDate) : '—'}</b>
                </V>
              </div>
            </V>
          ))}
        </V>
      )}

      {/* TAB: Contact */}
      {tab === 'Contact' && (
        <V style={card}>
          {[
            ['Type', client.type],
            ['Name', client.name],
            ['Company', client.company],
            ['Phone', client.phone],
            ['Email', client.email],
            ['Location', client.loc],
            ['Source', client.source],
          ].map(([a, b]) => (
            <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: MU }}>{a}</span>
              <b>{b || '—'}</b>
            </div>
          ))}
        </V>
      )}

      {/* TAB: Documents */}
      {tab === 'Documents' && (
        <V style={card}>
          <span style={{ color: MU, padding: '16px 0', textAlign: 'center' }}>No documents uploaded yet.</span>
        </V>
      )}

      {/* TAB: Quotations */}
      {tab === 'Quotations' && (
        <V style={card}>
          {services
            .filter((s) => {
              const curStage = (s.stagesConfig as any[]).find((st) => st.id === s.curStageId);
              return curStage?.name?.toLowerCase().includes('proposal');
            })
            .map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <b>{s.name}</b>
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Proposal pending</span>
              </div>
            ))}
          {!services.some((s) => {
            const curStage = (s.stagesConfig as any[]).find((st) => st.id === s.curStageId);
            return curStage?.name?.toLowerCase().includes('proposal');
          }) && <span style={{ color: MU, padding: '16px 0', textAlign: 'center' }}>No pending quotations.</span>}
        </V>
      )}

      {/* TAB: Communication */}
      {tab === 'Communication' && (
        <V style={{ gap: 10 }}>
          <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Communication History</b>
            <B k={1} onPress={() => onOpenModal('comm', { clientId: client.id })}>
              <I n="plus" s={16} />Add Communication
            </B>
          </V>

          <CommunicationList clientId={client.id} onOpenModal={onOpenModal} />
        </V>
      )}

      {/* TAB: Activity */}
      {tab === 'Activity' && (
        <V style={card}>
          {services
            .flatMap((s) => (s.history || []).map((x) => ({ ...x, sName: s.name })))
            .map((h, i) => (
              <V key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <b>
                  {h.sName} → {h.stageName}
                </b>
                <span style={{ fontSize: 12, color: MU }}>
                  {h.atDate} · {h.byUser?.name || 'Team'} · {h.note || '—'}
                </span>
              </V>
            ))}
          {!services.some((s) => (s.history || []).length) && (
            <span style={{ color: MU, padding: '16px 0', textAlign: 'center' }}>No stage activity recorded yet.</span>
          )}
        </V>
      )}
    </V>
  );
};

const CommunicationList: React.FC<{ clientId: string; onOpenModal: (t: string, d?: any) => void }> = ({
  clientId,
  onOpenModal,
}) => {
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    api.comms.list(clientId).then((res) => {
      setComms(res);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) return <span>Loading communications...</span>;
  if (!comms.length) return <span style={{ color: MU, padding: '16px 0' }}>No communication recorded yet.</span>;

  return (
    <V style={{ gap: 8 }}>
      {comms.map((x) => (
        <P
          key={x.id}
          onPress={() => onOpenModal('comm', { clientId, comm: x })}
          style={{ ...card, gap: 5, cursor: 'pointer' }}
        >
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <I n="chat" s={17} />
            <b>{x.type}</b>
          </V>
          <span style={{ fontSize: 12, color: MU }}>
            {x.byUser?.name || 'Advisor'} · {fmt(x.date)} {x.time}
          </span>
          <span style={{ fontSize: 14 }}>{x.details}</span>
          {x.followDate && (
            <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>
              Follow-up · {x.followType}: {fmt(x.followDate)} {x.followTime}
            </span>
          )}
        </P>
      ))}
    </V>
  );
};
