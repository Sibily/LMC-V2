import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { V, R, P, B, IB, card, G, MU, BD, TODAY, add, fmt, t12, Av } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { Task, Report } from '../types';
import { api } from '../api/client';
import { getSocket } from '../socket';

export const ReportsPage: React.FC<{
  tasks: Task[];
  team: any[];
  onOpenModal: (type: string, data?: any) => void;
}> = ({ tasks, team, onOpenModal }) => {
  const { user, settings, toast } = useAuth();
  const isMgmt = user?.role === 'management' && settings?.viewMode === 'management';

  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [periodKey, setPeriodKey] = useState<string>(TODAY);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [summaryNote, setSummaryNote] = useState<string>('');
  const [selectedReportUser, setSelectedReportUser] = useState<{
    user: any;
    report?: Report;
    tasks: Task[];
  } | null>(null);
  const [ackLoading, setAckLoading] = useState(false);

  const loadReports = async () => {
    try {
      const res = await api.reports.list({ frequency });
      setReportsList(res);
    } catch (e) {}
  };

  useEffect(() => {
    loadReports();
    const socket = getSocket();
    const handleMutation = (msg?: any) => {
      if (!msg || msg.entity === 'reports') {
        loadReports();
      }
    };
    socket.on('data_mutation', handleMutation);
    return () => {
      socket.off('data_mutation', handleMutation);
    };
  }, [frequency]);

  const completedTasks = tasks.filter((t) => {
    if (!t.done) return false;
    if (frequency === 'Daily') return (t.doneAt || t.date) === periodKey;
    if (frequency === 'Weekly') return (t.doneAt || t.date) >= periodKey && (t.doneAt || t.date) <= add(6);
    if (frequency === 'Monthly') return (t.doneAt || t.date).startsWith(periodKey.slice(0, 7));
    return true;
  });

  const myCompleted = completedTasks.filter((t) => t.whoUserId === user?.id);

  const existingReport = reportsList.find(
    (r) => r.userId === user?.id && r.frequency === frequency && r.periodKey === periodKey
  );

  const sendReport = async () => {
    try {
      await api.reports.submit({
        frequency,
        periodKey,
        note: summaryNote,
      });
      toast(`${frequency} report sent`);
      setSummaryNote('');
      loadReports();
    } catch (e: any) {
      toast('Failed to submit report');
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedReportUser?.report?.id) return;
    setAckLoading(true);
    try {
      const updated = await api.reports.acknowledge(selectedReportUser.report.id);
      toast('Report acknowledged & approved');
      setSelectedReportUser((prev) => (prev ? { ...prev, report: updated } : null));
      loadReports();
    } catch (e: any) {
      toast('Failed to acknowledge report');
    } finally {
      setAckLoading(false);
    }
  };

  const exportSingleUserExcel = (u: any, rep?: Report, uTasks: Task[] = []) => {
    try {
      const data = uTasks.map((t) => ({
        Employee: u.name,
        Status: rep?.status === 'approved' ? 'Approved' : rep ? 'Submitted' : 'Pending',
        SubmittedAt: rep?.submittedAt || 'N/A',
        ApprovedAt: rep?.acknowledgedAt || 'N/A',
        Task: t.title,
        Client: t.client?.name || 'Personal',
        Service: t.service?.name || '',
        Type: t.type,
        Date: t.doneAt || t.date,
        Time: t.doneTime || t.time,
        Note: t.doneNote || t.desc || '',
        ManagerNote: rep?.note || '',
      }));

      const ws = XLSX.utils.json_to_sheet(
        data.length > 0
          ? data
          : [{ Employee: u.name, Status: rep ? 'Submitted (No tasks)' : 'Pending', Note: rep?.note || '' }]
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${u.name} Report`);
      XLSX.writeFile(
        wb,
        `buzzrdesk-report-${u.name.toLowerCase().replace(/\s+/g, '_')}-${frequency.toLowerCase()}-${periodKey}.xlsx`
      );
      toast(`Exported ${u.name}'s report`);
    } catch (e) {
      toast('Failed to export Excel');
    }
  };

  const exportExcel = () => {
    try {
      const data = completedTasks.map((t) => ({
        Employee: t.whoUser?.name || 'Unassigned',
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
      XLSX.writeFile(wb, `buzzrdesk-report-${frequency.toLowerCase()}-${periodKey}.xlsx`);
      toast('Report exported to Excel');
    } catch (e) {
      toast('Failed to export Excel');
    }
  };

  return (
    <V style={{ gap: 12 }}>
      {/* Header */}
      <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 18 }}>{isMgmt ? 'All Reports' : 'My Reports'}</b>
        <B onPress={exportExcel} style={{ padding: '8px 12px', color: '#15803d' }}>
          <I n="download" s={16} />Excel
        </B>
      </V>

      {/* Frequency Toggle */}
      <V style={{ flexDirection: 'row', gap: 6 }}>
        {(['Daily', 'Weekly', 'Monthly'] as const).map((f) => (
          <P
            key={f}
            onPress={() => setFrequency(f)}
            style={{
              flex: 1,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              border: '1px solid ' + (frequency === f ? G : BD),
              background: frequency === f ? G : '#fff',
              color: frequency === f ? '#fff' : MU,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {f}
          </P>
        ))}
      </V>

      {/* Management Team Summary View */}
      {isMgmt ? (
        <V style={{ ...card, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ fontSize: 16 }}>Team Summary ({frequency})</b>
            <span style={{ fontSize: 12, color: MU }}>Click any member to inspect full report</span>
          </div>
          {team.map((u) => {
            const userTasks = completedTasks.filter((t) => t.whoUserId === u.id);
            const userRep = reportsList.find((r) => r.userId === u.id && r.periodKey === periodKey);
            const isApproved = userRep?.status === 'approved';

            return (
              <P
                key={u.id}
                onPress={() => setSelectedReportUser({ user: u, report: userRep, tasks: userTasks })}
                style={{
                  ...R,
                  flexDirection: 'row',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: '1px solid ' + (isApproved ? '#bfdbfe' : userRep ? '#bbf7d0' : '#e2e8f0'),
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Av n={u.name} s={44} url={u.avatarUrl} />
                <V style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <b style={{ fontSize: 14, color: '#0f172a' }}>{u.name}</b>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      {userTasks.length} tasks completed
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: isApproved ? '#dbeafe' : userRep ? '#dcfce7' : '#fee2e2',
                        color: isApproved ? '#1e40af' : userRep ? '#15803d' : '#dc2626',
                      }}
                    >
                      {isApproved ? '✓ Approved' : userRep ? 'Report submitted' : 'Pending'}
                    </span>
                    {userRep?.submittedAt && (
                      <span style={{ fontSize: 11, color: MU }}>
                        · {userRep.submittedAt}
                      </span>
                    )}
                  </div>
                  {userRep && userRep.note && (
                    <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Note: “{userRep.note}”
                    </span>
                  )}
                </V>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    flexShrink: 0,
                  }}
                >
                  <I n="eye" s={14} />
                  <span>View Details →</span>
                </div>
              </P>
            );
          })}
        </V>
      ) : (
        /* Employee Report View */
        <V style={{ gap: 12 }}>
          <V style={card}>
            <b style={{ fontSize: 16, marginBottom: 8 }}>
              {frequency} Log · {myCompleted.length} tasks completed
            </b>
            {myCompleted.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <V style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <b style={{ fontSize: 14 }}>{t.title}</b>
                  <span style={{ fontSize: 12, color: MU }}>
                    {t.client?.name ? t.client.name + ' · ' : ''}
                    {t.service?.name ? t.service.name + ' · ' : ''}
                    {t.doneTime || t.time}
                  </span>
                  {t.doneNote && <span style={{ fontSize: 13, color: '#334155' }}>{t.doneNote}</span>}
                </V>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <IB n="eye" title="View task details" onPress={() => onOpenModal('taskView', t)} />
                </div>
              </div>
            ))}
            {!myCompleted.length && <span style={{ color: MU, padding: '16px 0' }}>No completed work logged for this period.</span>}
          </V>

          <V style={{ ...card, gap: 10 }}>
            <b>{existingReport ? 'Update Sent Report' : 'Send Report to Manager'}</b>
            {existingReport && <span style={{ fontSize: 12, color: G }}>Submitted at {existingReport.submittedAt}</span>}
            <textarea
              rows={3}
              style={{ padding: '10px 12px', border: '1px solid ' + BD, borderRadius: 10, outline: 'none' }}
              placeholder="Summary or notes for your manager…"
              value={summaryNote || existingReport?.note || ''}
              onChange={(e) => setSummaryNote(e.target.value)}
            />
            <B k={1} onPress={sendReport}>
              <I n="report" s={16} />
              {existingReport ? 'Update Report' : `Send ${frequency} Report`}
            </B>
          </V>
        </V>
      )}

      {/* Report Inspection, Approval, and Export Modal */}
      {selectedReportUser && (
        <div
          onClick={() => setSelectedReportUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 620,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28), 0 4px 16px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
              animation: 'modalFadeIn 0.16s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Av n={selectedReportUser.user.name} s={44} url={selectedReportUser.user.avatarUrl} />
                <V style={{ gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 16, color: '#0f172a' }}>{selectedReportUser.user.name}</b>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {selectedReportUser.user.role === 'management' ? 'Management' : 'Employee'}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: MU }}>
                    {frequency} Report · {periodKey}
                  </span>
                </V>
              </div>

              <IB n="x" s={18} onPress={() => setSelectedReportUser(null)} />
            </div>

            {/* Scrollable Modal Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Submission Status Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background:
                    selectedReportUser.report?.status === 'approved'
                      ? '#eff6ff'
                      : selectedReportUser.report
                      ? '#f0fdf4'
                      : '#fef2f2',
                  border:
                    '1px solid ' +
                    (selectedReportUser.report?.status === 'approved'
                      ? '#bfdbfe'
                      : selectedReportUser.report
                      ? '#bbf7d0'
                      : '#fecaca'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <b
                    style={{
                      fontSize: 13,
                      color:
                        selectedReportUser.report?.status === 'approved'
                          ? '#1d4ed8'
                          : selectedReportUser.report
                          ? '#15803d'
                          : '#b91c1c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <I
                      n={selectedReportUser.report?.status === 'approved' ? 'tick' : selectedReportUser.report ? 'tick' : 'alert'}
                      s={16}
                    />
                    {selectedReportUser.report?.status === 'approved'
                      ? 'Report Approved'
                      : selectedReportUser.report
                      ? 'Report Submitted'
                      : 'Pending Submission'}
                  </b>
                  {selectedReportUser.report?.submittedAt && (
                    <span style={{ fontSize: 11, color: MU }}>
                      Submitted: {selectedReportUser.report.submittedAt}
                    </span>
                  )}
                </div>
                {selectedReportUser.report?.acknowledgedAt && (
                  <span style={{ fontSize: 11, color: '#2563eb' }}>
                    Signed off by manager on {selectedReportUser.report.acknowledgedAt}
                  </span>
                )}
                {!selectedReportUser.report && (
                  <span style={{ fontSize: 12, color: '#dc2626' }}>
                    {selectedReportUser.user.name} has not submitted their {frequency.toLowerCase()} report for {periodKey} yet.
                  </span>
                )}
              </div>

              {/* Employee Summary Note */}
              {selectedReportUser.report && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <b style={{ fontSize: 13, color: '#334155' }}>Employee Summary Note</b>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderLeft: '4px solid ' + G,
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      color: '#0f172a',
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedReportUser.report.note || (
                      <span style={{ color: MU, fontStyle: 'italic' }}>No notes attached to this report.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Completed Tasks Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <b style={{ fontSize: 13, color: '#334155' }}>
                    Completed Work ({selectedReportUser.tasks.length} {selectedReportUser.tasks.length === 1 ? 'task' : 'tasks'})
                  </b>
                  <span style={{ fontSize: 11, color: MU }}>Period: {periodKey}</span>
                </div>

                {selectedReportUser.tasks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedReportUser.tasks.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: '12px 14px',
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <b style={{ fontSize: 13, color: '#0f172a' }}>{t.title}</b>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#dcfce7',
                                color: '#15803d',
                              }}
                            >
                              {t.doneTime || t.time || 'Completed'}
                            </span>
                            <IB n="eye" title="View task details" onPress={() => onOpenModal('taskView', t)} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MU, flexWrap: 'wrap' }}>
                          {t.client?.name && (
                            <span>
                              Client: <b style={{ color: '#334155' }}>{t.client.name}</b>
                            </span>
                          )}
                          {t.service?.name && <span>· Service: {t.service.name}</span>}
                          <span>· Type: {t.type}</span>
                          <span>· Date: {t.doneAt || t.date}</span>
                        </div>

                        {t.doneNote && (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#15803d',
                              background: '#f0fdf4',
                              border: '1px dashed #bbf7d0',
                              padding: '6px 10px',
                              borderRadius: 8,
                              marginTop: 2,
                            }}
                          >
                            <b>Completion note:</b> {t.doneNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                      color: MU,
                      fontSize: 13,
                    }}
                  >
                    No completed tasks logged for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                gap: 10,
              }}
            >
              {/* Individual Export Button */}
              <B
                onPress={() => exportSingleUserExcel(selectedReportUser.user, selectedReportUser.report, selectedReportUser.tasks)}
                style={{ padding: '8px 14px', fontSize: 13, color: '#15803d', background: '#fff', border: '1px solid #cbd5e1', gap: 6 }}
              >
                <I n="download" s={15} />
                <span>Export Member Excel</span>
              </B>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isMgmt && selectedReportUser.report && selectedReportUser.report.status !== 'approved' && (
                  <B
                    k={1}
                    onPress={handleAcknowledge}
                    style={{
                      background: ackLoading ? '#94a3b8' : '#10b981',
                      color: '#fff',
                      padding: '8px 16px',
                      fontSize: 13,
                      gap: 6,
                      cursor: ackLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <I n="tick" s={15} />
                    <span>{ackLoading ? 'Approving…' : 'Acknowledge & Approve'}</span>
                  </B>
                )}

                {selectedReportUser.report?.status === 'approved' && (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#15803d',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      paddingRight: 6,
                    }}
                  >
                    <I n="tick" s={16} /> Approved
                  </span>
                )}

                <B
                  onPress={() => setSelectedReportUser(null)}
                  style={{ padding: '8px 16px', fontSize: 13, background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}
                >
                  Close
                </B>
              </div>
            </div>
          </div>
        </div>
      )}
    </V>
  );
};
