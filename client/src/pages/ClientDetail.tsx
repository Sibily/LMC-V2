import React, { useState, useEffect } from 'react';
import { V, R, P, B, IB, Av, card, Pipe, G, MU, BD, STAT, fmt, ago, t12, aed, szF, refLabel, scol } from '../components/Common';
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
  const [isWide, setIsWide] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 900 : true));

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const services = client.services || [];
  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];
  const clientTasks = tasks.filter((t) => t.clientId === client.id);
  const sortT = (a: Task, b: Task) => (a.date + a.time).localeCompare(b.date + b.time);
  const clientReminders = clientTasks.filter((t) => t.type === 'Reminder' && !t.done).sort(sortT);

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

  const togRem = async (t: Task) => {
    try {
      await api.tasks.toggle(t.id);
      onRefreshClient();
      toast(t.done ? 'Reopened' : (t.type === 'Reminder' ? 'Reminder done · see Completed' : 'Done'));
    } catch (e: any) {
      toast('Failed to update reminder');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const nowHM = new Date().toTimeString().slice(0, 5);

  const remRow = (t: Task) => {
    const late = !t.done && (t.date < todayStr || (t.date === todayStr && t.time < nowHM));
    return (
      <V key={t.id} style={{ ...R, flexDirection: 'row', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
        <P
          onPress={() => togRem(t)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            border: '2px solid ' + (t.done ? G : late ? '#fca5a5' : '#cbd5e1'),
            background: t.done ? G : '#fff',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {t.done && <I n="tick" s={15} />}
        </P>
        <P onPress={() => onOpenModal('tview', { id: t.id })} style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
          <b
            style={{
              textDecoration: t.done ? 'line-through' : 'none',
              color: t.done ? MU : '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.title}
          </b>
          <V style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: client.name ? '#1d4ed8' : MU,
                background: client.name ? '#dbeafe' : '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              <I n={client.name ? 'users' : 'user'} s={11} />
              {client.name || 'Me'}
            </span>
            {t.service?.name && (
              <span style={{ fontSize: 11, color: MU }}>
                {t.service.name}
              </span>
            )}
          </V>
        </P>
        <V style={{ alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: t.done ? MU : late ? '#dc2626' : '#be185d',
              background: t.done ? '#f1f5f9' : late ? '#fee2e2' : '#fce7f3',
              padding: '3px 8px',
              borderRadius: 20,
            }}
          >
            <I n="clock" s={11} />
            {t.done ? t12(t.doneTime || '') : ((t.date === todayStr || t.date < todayStr ? '' : fmt(t.date) + ' · ') + t12(t.time))}
          </span>
          {late && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>MISSED</span>}
        </V>
      </V>
    );
  };

  const curStageName = activeService
    ? (activeService.stagesConfig as any[]).find((st) => st.id === activeService.curStageId)?.name || 'Enquiry'
    : 'No services';

  const stages = (activeService?.stagesConfig as any[]) || [];
  const ci = activeService ? stages.findIndex((x) => x.id === activeService.curStageId) : 0;
  const di = activeService ? stages.findIndex((x) => x.type === 'decision' && x.res !== 'yes') : -1;
  const decisionStage = di >= 0 ? stages[di] : null;

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
          {user?.role === 'management' && (
            <IB
              n="trash"
              title="Delete client"
              style={{ color: '#dc2626' }}
              onPress={() => onOpenModal('deleteClient', { client })}
            />
          )}
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
      </V>      {/* Tabs Row */}
      {isWide ? (
        <V style={{ flexDirection: 'row', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
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
      ) : (
        <V style={{ gap: 6 }}>
          <b style={{ fontSize: 13, color: G }}>{tab}</b>
          <V style={{ flexDirection: 'row', gap: 6 }}>
            {tabs.map((t) => (
              <P
                key={t}
                title={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1,
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  background: tab === t ? G : '#fff',
                  color: tab === t ? '#fff' : MU,
                  border: '1px solid ' + (tab === t ? G : BD),
                }}
              >
                <I n={TI[t]} s={18} />
              </P>
            ))}
          </V>
        </V>
      )}

      {/* TAB: Overview */}
      {tab === 'Overview' &&
        (activeService ? (
          <V style={{ gap: 12 }}>
            <V style={{ ...card, gap: 12 }}>
              {(() => {
                const svI = (n: string) => {
                  const s = (n || '').toLowerCase();
                  return s.includes('business')
                    ? 'building'
                    : s.includes('trademark')
                    ? 'shield'
                    : s.includes('pro')
                    ? 'briefcase'
                    : s.includes('tax')
                    ? 'receipt'
                    : s.includes('visa')
                    ? 'globe'
                    : 'task';
                };
                const sc = activeService ? scol({ stages: activeService.stagesConfig, cur: activeService.curStageId }) : G;
                const sortedServices = [...services].sort((a: any, b: any) => {
                  const aName = (a.stagesConfig as any[])?.find((st: any) => st.id === a.curStageId)?.name || '';
                  const bName = (b.stagesConfig as any[])?.find((st: any) => st.id === b.curStageId)?.name || '';
                  return Number(aName.toLowerCase() === 'completed') - Number(bName.toLowerCase() === 'completed');
                });
                const serviceIndex = services.indexOf(activeService) + 1;

                return (
                  <>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignSelf: 'flex-start',
                        alignItems: 'center',
                        gap: 7,
                        color: sc,
                        background: sc + '18',
                        padding: '6px 14px 6px 10px',
                        borderRadius: 20,
                        marginBottom: 2,
                      }}
                    >
                      <I n={svI(activeService.name)} s={16} />
                      <b style={{ fontSize: 15, fontWeight: 650 }}>Client Stage</b>
                    </div>

                    <V style={{ gap: 8 }}>
                      <V>
                        <b>{activeService.name}</b>
                        <span style={{ fontSize: 12, color: MU }}>
                          {curStageName} · {serviceIndex} of {services.length}
                        </span>
                      </V>

                      {/* Service icon buttons */}
                      <V style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {sortedServices.map((s: any) => {
                          const cc = scol({ stages: s.stagesConfig, cur: s.curStageId });
                          const on = s.id === activeService.id;
                          return (
                            <P
                              key={s.id}
                              title={s.name}
                              onPress={() => setSelectedServiceId(s.id)}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 13,
                                background: on ? cc : cc + '22',
                                color: on ? '#fff' : cc,
                                border: '2px solid ' + (on ? cc : 'transparent'),
                              }}
                            >
                              <I n={svI(s.name)} s={20} />
                            </P>
                          );
                        })}
                        <P
                          title="Add service"
                          onPress={() => onOpenModal('svc', { clientId: client.id })}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            color: MU,
                            border: '2px dashed #cbd5e1',
                          }}
                        >
                          <I n="plus" s={20} />
                        </P>
                      </V>
                    </V>
                  </>
                );
              })()}

              <Pipe
                st={activeService.stagesConfig as any[]}
                cur={activeService.curStageId}
                pick={(s: any) => {
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
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: MU }}>Last update</span>
                <b>{activeService.updDate ? fmt(activeService.updDate) + ' · ' + ago(activeService.updDate) : '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: MU }}>Last note</span>
                <b>{(activeService.history && activeService.history.length > 0 ? activeService.history[activeService.history.length - 1]?.note : '') || '—'}</b>
              </div>
              {(() => {
                const nextRem = clientReminders
                  .filter((t) => !t.service || t.service.id === activeService.id || t.service.name === activeService.name)
                  .sort(sortT)[0];
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ color: MU }}>Next reminder</span>
                    <b>{nextRem ? fmt(nextRem.date) + ' · ' + t12(nextRem.time) : 'None set'}</b>
                  </div>
                );
              })()}
            </V>

            {/* Reminders Card */}
            <V style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I n="bell" s={18} />
                  <b>Reminders</b>
                </div>
                <span style={{ background: '#f1f5f9', color: MU, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
                  {clientReminders.length}
                </span>
              </div>
              {clientReminders.length > 0 ? (
                clientReminders.map(remRow)
              ) : (
                <span style={{ color: MU, padding: '10px 0' }}>No reminders for this client.</span>
              )}
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
                {di >= 0 && ci >= di - 1 && decisionStage && (
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

            {/* Full Activity Card matching prototype line 298 */}
            <V style={{ ...card, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <I n="history" s={18} />
                <b>Full Activity</b>
              </div>
              {(() => {
                const allHist = (services || []).flatMap((s: any) =>
                  (s.history || []).map((x: any) => ({ ...x, sname: s.name, sid: s.id }))
                ).sort((a: any, b: any) => {
                  const tA = a.atDate || a.createdAt || '';
                  const tB = b.atDate || b.createdAt || '';
                  return tB.localeCompare(tA);
                });

                if (!allHist.length) {
                  return <span style={{ fontSize: 13, color: MU }}>No activity recorded yet.</span>;
                }

                return allHist.slice(0, 8).map((x: any, i: number, arr: any[]) => (
                  <P
                    key={x.id || i}
                    onPress={() =>
                      onOpenModal('actlog', {
                        historyItem: x,
                        serviceName: x.sname || activeService?.name || 'Service',
                        clientName: client.name,
                      })
                    }
                    style={{
                      flexDirection: 'column',
                      padding: '10px 0',
                      borderBottom: i === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                      gap: 3,
                    }}
                  >
                    <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {x.sname} · {x.stageName || 'Stage update'}
                      </b>
                      <span style={{ color: G, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>View ›</span>
                    </V>
                    <span style={{ fontSize: 13, color: MU }}>{x.note || '—'}</span>
                    <span style={{ fontSize: 12, color: MU }}>
                      {x.byUser?.name || 'Team'} · {x.atDate ? fmt(x.atDate) : 'Today'}
                    </span>
                  </P>
                ));
              })()}
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
            ['Referred by', refLabel(client)],
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
        <V style={{ gap: 10 }}>
          <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <b>Documents ({client.documents?.length || 0})</b>
            <B k={1} onPress={() => onOpenModal('doc', { clientId: client.id, services: client.services })}>
              <I n="plus" s={16} />Add Document
            </B>
          </V>

          {(client.documents || []).length > 0 ? (
            <V style={{ gap: 8 }}>
              {(client.documents || []).map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    ...card,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <I n="file" s={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{doc.name}</b>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#0369a1',
                            background: '#f0f9ff',
                            padding: '2px 8px',
                            borderRadius: 12,
                          }}
                        >
                          {doc.type}
                        </span>
                        {doc.service && (
                          <span style={{ fontSize: 11.5, color: MU }}>· {doc.service.name}</span>
                        )}
                        {doc.fileSize && (
                          <span style={{ fontSize: 11.5, color: MU }}>· {szF(doc.fileSize)}</span>
                        )}
                      </div>
                      {doc.note && (
                        <span style={{ fontSize: 12, color: MU, marginTop: 4, display: 'block' }}>
                          {doc.note}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName || doc.name}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#f1f5f9',
                          color: '#0f172a',
                          textDecoration: 'none',
                        }}
                        title="Download file"
                      >
                        <I n="download" s={16} />
                      </a>
                    )}
                    <IB
                      n="edit"
                      onPress={() => onOpenModal('doc', { clientId: client.id, doc, services: client.services })}
                    />
                  </div>
                </div>
              ))}
            </V>
          ) : (
            <V style={{ ...card, padding: 24, alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: '#f1f5f9',
                  color: MU,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <I n="file" s={22} />
              </div>
              <span style={{ color: MU, fontSize: 13 }}>No documents uploaded yet.</span>
              <B k={1} onPress={() => onOpenModal('doc', { clientId: client.id, services: client.services })}>
                <I n="plus" s={16} />Add first document
              </B>
            </V>
          )}
        </V>
      )}

      {/* TAB: Quotations & Invoices */}
      {tab === 'Quotations' && (
        <V style={{ gap: 12 }}>
          <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <b>Quotations & Invoices</b>
            <B k={1} onPress={() => onOpenModal('invoice', { clientId: client.id, services: client.services, existingInvoiceCount: (client.invoices || []).length })}>
              <I n="plus" s={16} />Create Invoice
            </B>
          </V>

          {/* Financial summary KPI tiles */}
          {(() => {
            const invs = client.invoices || [];
            const outstanding = invs.filter((i) => i.status !== 'Paid').reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
            const paid = invs.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#fef3c7', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>Outstanding</span>
                  <b style={{ fontSize: 17, color: '#92400e' }}>{aed(outstanding)}</b>
                </div>
                <div style={{ background: '#dcfce7', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Paid</span>
                  <b style={{ fontSize: 17, color: '#166534' }}>{aed(paid)}</b>
                </div>
              </div>
            );
          })()}

          {/* Pending Service Proposals */}
          {services.some((s) => (s.stagesConfig as any[]).find((st) => st.id === s.curStageId)?.name?.toLowerCase().includes('proposal')) && (
            <V style={{ ...card, gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: MU, textTransform: 'uppercase' }}>Pending Proposals</span>
              {services
                .filter((s) => {
                  const curStage = (s.stagesConfig as any[]).find((st) => st.id === s.curStageId);
                  return curStage?.name?.toLowerCase().includes('proposal');
                })
                .map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <b>{s.name}</b>
                    <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: 13 }}>Proposal pending</span>
                  </div>
                ))}
            </V>
          )}

          {/* Invoices List */}
          {(client.invoices || []).length > 0 ? (
            <V style={{ gap: 8 }}>
              {(client.invoices || []).map((inv) => {
                const isPaid = inv.status === 'Paid';
                const isOverdue = inv.status === 'Overdue';
                const statusBg = isPaid ? '#dcfce7' : isOverdue ? '#fee2e2' : '#fef3c7';
                const statusColor = isPaid ? '#15803d' : isOverdue ? '#b91c1c' : '#b45309';

                return (
                  <div
                    key={inv.id}
                    style={{
                      ...card,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b style={{ fontSize: 15, color: '#0f172a' }}>{inv.invoiceNo}</b>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: statusBg,
                            color: statusColor,
                          }}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, color: '#334155', marginTop: 2, display: 'block' }}>
                        {inv.description || inv.service?.name || 'General Legal Fee'}
                      </span>
                      <span style={{ fontSize: 11.5, color: MU }}>
                        Due: {fmt(inv.dueDate)} {inv.vatApplicable ? '· Includes 5% VAT' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <b style={{ fontSize: 16, color: '#0f172a' }}>{aed(inv.totalAmount)}</b>
                      <IB
                        n="edit"
                        onPress={() => onOpenModal('invoice', { clientId: client.id, invoice: inv, services: client.services })}
                      />
                    </div>
                  </div>
                );
              })}
            </V>
          ) : (
            <V style={{ ...card, padding: 20, alignItems: 'center', gap: 8 }}>
              <span style={{ color: MU, fontSize: 13 }}>No invoices generated for this client yet.</span>
            </V>
          )}
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
          {(() => {
            const allItems = services
              .flatMap((s) => (s.history || []).map((x) => ({ ...x, sName: s.name, serviceId: s.id })))
              .sort((a: any, b: any) => {
                const tA = a.atDate || a.createdAt || '';
                const tB = b.atDate || b.createdAt || '';
                return tB.localeCompare(tA);
              });

            if (!allItems.length) {
              return (
                <span style={{ color: MU, padding: '16px 0', textAlign: 'center' }}>
                  No stage activity recorded yet.
                </span>
              );
            }

            const ACT_CO: Record<string, string> = { Reminder: '#db2777', Task: '#7c3aed', Note: '#0369a1' };
            const ACT_IC: Record<string, string> = { Reminder: 'bell', Task: 'task', Note: 'note' };
            const ACT_BG: Record<string, string> = { Reminder: '#fdf2f8', Task: '#f5f3ff', Note: '#e0f2fe' };

            return allItems.map((h: any, i: number, arr: any[]) => {
              const acts = (h.acts || []).slice();
              if (h.nextAction && h.followUpDate) {
                acts.unshift({
                  id: 'n' + h.id,
                  kind: 'Reminder',
                  title: h.nextAction,
                  who: h.assignedUser?.name,
                  date: h.followUpDate,
                  time: h.followUpTime,
                });
              }

              return (
                <P
                  key={h.id || i}
                  onPress={() => onOpenModal('actlog', { historyItem: h, serviceName: h.sName, clientName: client.name })}
                  style={{
                    flexDirection: 'column',
                    padding: '10px 0',
                    borderBottom: i === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                    gap: 3,
                    cursor: 'pointer',
                  }}
                >
                  <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.sName} · {h.stageName || 'Stage update'}
                    </b>
                    <span style={{ color: G, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>View ›</span>
                  </V>
                  <span style={{ fontSize: 13, color: MU }}>{h.note || '—'}</span>

                  {acts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                      {acts.map((item: any, actIdx: number) => {
                        const kind = item.kind || 'Task';
                        const co = ACT_CO[kind] || '#7c3aed';
                        const bg = ACT_BG[kind] || '#f5f3ff';
                        const ic = ACT_IC[kind] || 'task';
                        return (
                          <span
                            key={item.id || actIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              color: co,
                              background: bg,
                              padding: '3px 8px',
                              borderRadius: 20,
                            }}
                          >
                            <I n={ic} s={11} />
                            {kind}
                            {item.who ? ' → ' + item.who : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <span style={{ fontSize: 12, color: MU }}>
                    {h.byUser?.name || 'Team'} · {h.atDate ? fmt(h.atDate) : 'Today'}
                  </span>
                </P>
              );
            });
          })()}
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
