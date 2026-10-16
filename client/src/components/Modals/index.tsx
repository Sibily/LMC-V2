import React, { useState } from 'react';
import { V, R, P, B, IB, F, Sel, Av, Modal, inp, card, G, MU, BD, TODAY, add, fmt, t12, STAT, COL, col, celebrate } from '../Common';
import { I } from '../Icons';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Country codes
export const CCS = [
  ['+971', '🇦🇪'],
  ['+966', '🇸🇦'],
  ['+974', '🇶🇦'],
  ['+968', '🇴🇲'],
  ['+973', '🇧🇭'],
  ['+965', '🇰🇼'],
  ['+91', '🇮🇳'],
  ['+92', '🇵🇰'],
  ['+880', '🇧🇩'],
  ['+94', '🇱🇰'],
  ['+977', '🇳🇵'],
  ['+63', '🇵🇭'],
  ['+20', '🇪🇬'],
  ['+962', '🇯🇴'],
  ['+961', '🇱🇧'],
  ['+44', '🇬🇧'],
  ['+1', '🇺🇸'],
  ['+7', '🇷🇺'],
  ['+49', '🇩🇪'],
  ['+33', '🇫🇷'],
  ['+90', '🇹🇷'],
  ['+86', '🇨🇳'],
  ['+234', '🇳🇬'],
  ['+254', '🇰🇪'],
];

export const splitPh = (p: string) => {
  p = String(p || '').replace(/\s/g, '');
  if (!p.startsWith('+')) return { cc: '+971', phone: p.replace(/^0+/, '') };
  const m = [...CCS].sort((a, b) => b[0].length - a[0].length).find((x) => p.startsWith(x[0]));
  return m ? { cc: m[0], phone: p.slice(m[0].length) } : { cc: '+971', phone: p.slice(1) };
};

export const fullPh = (cc: string, n: string) => {
  n = String(n || '').trim();
  const d = n.replace(/[^0-9]/g, '');
  if (!d) return '';
  if (n.startsWith('+')) return '+' + d;
  if (d.startsWith('00')) return '+' + d.slice(2);
  return cc + d.replace(/^0+/, '');
};

// 1. Client Form
export const ClientForm: React.FC<{
  client?: any;
  onClose: () => void;
  onSaved: (client: any) => void;
}> = ({ client, onClose, onSaved }) => {
  const { toast } = useAuth();
  const [f, sf] = useState(
    client
      ? { ...client, ...splitPh(client.phone) }
      : { type: 'Individual', name: '', company: '', cc: '+971', phone: '', email: '', loc: '', source: '' }
  );

  const save = async () => {
    if (!f.name.trim()) {
      toast('Enter a name to create the client');
      return;
    }
    const phone = fullPh(f.cc, f.phone);
    const data = { ...f, name: f.name.trim(), phone };
    try {
      if (client?.id) {
        const updated = await api.clients.update(client.id, data);
        toast('Client updated');
        onSaved(updated);
      } else {
        const created = await api.clients.create(data);
        toast('Client created · you can add phone, email and services later');
        onSaved(created);
      }
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error saving client');
    }
  };

  return (
    <Modal title={client ? 'Edit Client' : 'Add Client'} close={onClose}>
      <V style={{ gap: 12 }}>
        {!client && (
          <V style={{ flexDirection: 'row', gap: 8 }}>
            {['Individual', 'Company'].map((t) => (
              <B key={t} k={f.type === t} style={{ flex: 1 }} onPress={() => sf({ ...f, type: t })}>
                {t}
              </B>
            ))}
          </V>
        )}
        <F l={f.type === 'Company' ? 'Contact Person / Full Name' : 'Full Name'}>
          <input style={inp} value={f.name} onChange={(e) => sf({ ...f, name: e.target.value })} placeholder="e.g. Ahmed Saeed" />
        </F>
        {f.type === 'Company' && (
          <F l="Company Name">
            <input style={inp} value={f.company} onChange={(e) => sf({ ...f, company: e.target.value })} placeholder="e.g. Saeed Trading LLC" />
          </F>
        )}
        <F l="Phone">
          <V style={{ flexDirection: 'row', gap: 8 }}>
            <Sel style={{ ...inp, width: 128, flexShrink: 0 }} value={f.cc} onChange={(e) => sf({ ...f, cc: e.target.value })}>
              {CCS.map(([k2, n2]) => (
                <option key={k2} value={k2}>
                  {`${n2} ${k2}`}
                </option>
              ))}
            </Sel>
            <input
              type="tel"
              inputMode="tel"
              placeholder="50 123 4567"
              style={{ ...inp, flex: 1, minWidth: 0 }}
              value={f.phone}
              onChange={(e) => sf({ ...f, phone: e.target.value })}
            />
          </V>
          {f.phone && <span style={{ fontSize: 12, color: MU }}>Saved as {fullPh(f.cc, f.phone)}</span>}
        </F>
        <F l="Email">
          <input style={inp} value={f.email} onChange={(e) => sf({ ...f, email: e.target.value })} placeholder="name@company.ae" />
        </F>
        <F l="Location">
          <input style={inp} value={f.loc} onChange={(e) => sf({ ...f, loc: e.target.value })} placeholder="e.g. Dubai" />
        </F>
        <F l="Source">
          <select
            style={inp}
            value={f.source === 'By advisor' || f.source === 'Other' ? f.source : (f.source ? 'Other' : '')}
            onChange={(e) => {
              const val = e.target.value;
              sf({ ...f, source: val });
            }}
          >
            <option value="">Direct / Walk-in / Social media</option>
            <option value="By advisor">By advisor</option>
            <option value="Other">Other referral source</option>
          </select>
        </F>
        {(f.source === 'By advisor' || f.source === 'Other') && (
          <F l={f.source === 'By advisor' ? 'Advisor Name' : 'Referrer Name / Details'}>
            <input
              style={inp}
              placeholder={f.source === 'By advisor' ? 'e.g. Adv. Tariq Al Nuaimi' : 'e.g. Noor partner network'}
              value={f.referrer || ''}
              onChange={(e) => sf({ ...f, referrer: e.target.value })}
            />
          </F>
        )}
        {!client && <span style={{ fontSize: 12, color: MU }}>Only the name is required. Add the rest later from the client profile.</span>}
        <B k={1} onPress={save}>
          {client ? 'Save' : 'Create Client'}
        </B>
      </V>
    </Modal>
  );
};

// 2. Task Form
export const TaskForm: React.FC<{
  clientId?: string;
  clients: any[];
  team: any[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ clientId, clients, team, onClose, onSaved }) => {
  const { user, toast } = useAuth();
  const others = team.filter((u) => u.id !== user?.id);
  const [f, sf] = useState({
    title: '',
    desc: '',
    cid: clientId || '',
    date: TODAY,
    time: '09:00',
    whoUserId: user?.id || '',
    other: false,
  });

  const save = async () => {
    if (!f.title.trim()) {
      toast('Enter a task title');
      return;
    }
    try {
      await api.tasks.create({
        title: f.title.trim(),
        desc: f.desc,
        date: f.date,
        time: f.time,
        whoUserId: f.other ? f.whoUserId : user?.id,
        clientId: f.cid || null,
        type: f.cid ? 'Task' : 'Personal',
      });
      toast('Task added');
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error creating task');
    }
  };

  return (
    <Modal title="Add Task" close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Task">
          <input style={inp} placeholder="e.g. Research competitors" value={f.title} onChange={(e) => sf({ ...f, title: e.target.value })} />
        </F>
        <F l="Description (optional)">
          <input style={inp} value={f.desc} onChange={(e) => sf({ ...f, desc: e.target.value })} />
        </F>
        <F l="Client (optional)">
          <Sel style={inp} value={f.cid} onChange={(e) => sf({ ...f, cid: e.target.value })}>
            <option value="">No client · personal / general</option>
            {clients.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Sel>
        </F>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <F l="Date">
            <input type="date" style={inp} value={f.date} onChange={(e) => sf({ ...f, date: e.target.value })} />
          </F>
          <F l="Time">
            <input type="time" style={inp} value={f.time} onChange={(e) => sf({ ...f, time: e.target.value })} />
          </F>
        </div>
        <V style={{ gap: 6 }}>
          <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>For</span>
          <V style={{ flexDirection: 'row', gap: 8 }}>
            <B k={!f.other} style={{ flex: 1 }} onPress={() => sf({ ...f, other: false, whoUserId: user?.id || '' })}>
              <I n="user" s={16} />Myself
            </B>
            <B k={f.other} style={{ flex: 1 }} onPress={() => sf({ ...f, other: true, whoUserId: others[0]?.id || user?.id || '' })}>
              <I n="users" s={16} />Someone else
            </B>
          </V>
          {f.other && (
            <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {others.map((u) => (
                <P
                  key={u.id}
                  onPress={() => sf({ ...f, whoUserId: u.id })}
                  style={{
                    ...R,
                    gap: 6,
                    padding: '5px 12px 5px 6px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 13,
                    border: '1px solid ' + (f.whoUserId === u.id ? G : BD),
                    background: f.whoUserId === u.id ? '#f0fdf4' : '#fff',
                    color: f.whoUserId === u.id ? G : MU,
                  }}
                >
                  <Av n={u.name} s={22} url={u.avatarUrl} />
                  {u.name}
                </P>
              ))}
            </V>
          )}
        </V>
        <B k={1} onPress={save}>
          Add Task
        </B>
      </V>
    </Modal>
  );
};

// Legal service preset catalog
export const LEGAL_SERVICE_OPTIONS = [
  'Legal Services',
  'Legal Consultancy',
  'Legal Advice',
  'Legal Drafting',
  'Agreements & Contracts',
  'Legal Opinion',
  'Legal Structuring',
  'Litigation & Arbitration',
  'Mediation',
  'Case Analysis',
  'Civil & Criminal Matters',
  'Corporate & Commercial',
  'Employment Disputes',
  'Consumer Disputes',
  'Tenancy Disputes',
  'Asset Protection',
  'Other / Custom Service',
];

// Service icon and color rules
export const SERVICE_ICON_RULES: [RegExp, string, string, string][] = [
  [/wills|probate|estate planning|inheritance/i, 'book', '#7c3aed', '#f5f3ff'],
  [/trademark|patent|copyright|intellectual property|industrial design|ip infringement/i, 'shield', '#7c3aed', '#f5f3ff'],
  [/legal services|legal consultancy|legal advice|legal opinion/i, 'shield', '#0284c7', '#e0f2fe'],
  [/litigation|arbitration|court|dispute|civil & criminal/i, 'flag', '#dc2626', '#fef2f2'],
  [/contract|drafting|agreement/i, 'file', '#2563eb', '#eff6ff'],
  [/corporate|commercial|structuring|setup/i, 'building', '#0d9488', '#f0fdfa'],
  [/employment|labour/i, 'users', '#ea580c', '#fff7ed'],
  [/tenancy|rental|real estate/i, 'home', '#16a34a', '#f0fdf4'],
  [/mediation|negotiation/i, 'chat', '#0d9488', '#f0fdfa'],
];

export function serviceIconMeta(name: string) {
  const s = String(name || '');
  const hit = SERVICE_ICON_RULES.find(([re]) => re.test(s));
  if (hit) return { icon: hit[1], color: hit[2], bg: hit[3] };
  return { icon: 'briefcase', color: '#475569', bg: '#f1f5f9' };
}

// 3. Service Form
export const SvcForm: React.FC<{
  clientId: string;
  service?: any;
  team: any[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ clientId, service, team, onClose, onSaved }) => {
  const { user, toast } = useAuth();
  const [name, setName] = useState(service ? service.name : '');
  const [respUserId, setRespUserId] = useState(service ? service.respUserId : user?.id);
  const [catalog, setCatalog] = useState<string[]>([]);

  React.useEffect(() => {
    api.services.getCatalog().then(setCatalog).catch(() => {});
  }, []);

  const base = LEGAL_SERVICE_OPTIONS.filter((x) => x !== 'Other / Custom Service');
  const allServices = Array.from(new Set([...base, ...catalog]));
  const q = name.trim().toLowerCase();
  const filtered = q ? allServices.filter((x) => x.toLowerCase().includes(q)) : allServices;

  const save = async () => {
    if (!name.trim()) {
      toast('Please enter or select a service name');
      return;
    }
    try {
      if (service) {
        await api.services.update(service.id, { name: name.trim(), respUserId });
        toast('Service updated');
      } else {
        await api.services.create(clientId, { name: name.trim(), respUserId });
        // Automatically save custom service to catalog if not already present
        if (!allServices.some((x) => x.toLowerCase() === name.trim().toLowerCase())) {
          api.services.addCatalog(name.trim()).catch(() => {});
        }
        toast('Service added');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error saving service');
    }
  };

  return (
    <Modal title={service ? 'Edit Service' : 'Add Service'} close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Service *">
          <input
            id="buzzrdesk-custom-service-input"
            style={inp}
            placeholder="Search legal services or type a custom one..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 7,
              marginTop: 10,
              maxHeight: 180,
              overflowY: 'auto',
              padding: 2,
            }}
          >
            {filtered.slice(0, 15).map((x) => {
              const on = x.toLowerCase() === name.trim().toLowerCase();
              const meta = serviceIconMeta(x);
              return (
                <P
                  key={x}
                  onPress={() => setName(x)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 12.5,
                    border: '1px solid ' + (on ? meta.color : BD),
                    background: on ? meta.bg : '#fff',
                    color: on ? meta.color : '#334155',
                  }}
                >
                  <I n={meta.icon} s={13} />
                  {x}
                </P>
              );
            })}
          </div>
        </F>
        <F l="Responsible Team Member">
          <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {team.map((u) => (
              <P
                key={u.id}
                onPress={() => setRespUserId(u.id)}
                style={{
                  ...R,
                  gap: 6,
                  padding: '5px 12px 5px 6px',
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1px solid ' + (respUserId === u.id ? G : BD),
                  background: respUserId === u.id ? '#f0fdf4' : '#fff',
                  color: respUserId === u.id ? G : MU,
                }}
              >
                <Av n={u.name} s={22} url={u.avatarUrl} />
                {u.name}
                {u.id === user?.id ? ' (me)' : ''}
              </P>
            ))}
          </V>
        </F>
        <B k={1} onPress={save}>
          {service ? 'Save Changes' : 'Add Service'}
        </B>
      </V>
    </Modal>
  );
};

// 4. Stage Update Form
export const StageForm: React.FC<{
  client: any;
  service: any;
  team: any[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ client, service, team, onClose, onSaved }) => {
  const { user, toast } = useAuth();
  const stages = service.stagesConfig as any[];
  const si = stages.findIndex((x) => x.id === service.curStageId);
  const opts = stages.filter((x) => x.type !== 'decision');
  const nxt = opts.find((x) => stages.indexOf(x) > si) || opts[0];
  const others = team.filter((u) => u.id !== user?.id);

  const [f, sf] = useState({
    stageId: service.curStageId,
    note: '',
    keep: true,
    sopen: true, // Opened by default so user immediately sees next action
    sk: 'Task' as 'Reminder' | 'Task' | 'Note',
    stx: '',
    sbd: '',
    sd: TODAY,
    stm: new Date().toTimeString().slice(0, 5),
    sother: false,
    swho: [] as string[],
    tried: false,
  });

  const chip = (on: boolean) => ({
    padding: '7px 12px',
    borderRadius: 20,
    fontWeight: 600,
    fontSize: 13,
    border: '1px solid ' + (on ? G : BD),
    background: on ? '#f0fdf4' : '#fff',
    color: on ? G : MU,
  });

  const okI = f.sk === 'Note' ? !!(f.sbd.trim() || f.stx.trim()) : !!f.stx.trim();

  const save = async () => {
    // If next action is enabled and user selected someone else but didn't pick any colleague
    if (f.sopen && f.sother && (!Array.isArray(f.swho) || !f.swho.length) && okI) {
      toast('Select at least one colleague to assign');
      return;
    }

    try {
      const selectedStage = stages.find((x) => x.id === (f.keep ? service.curStageId : f.stageId));
      const stageName = selectedStage?.name || 'Stage updated';

      // Build acts / next action items if provided
      let acts: any[] = [];
      let nextActionTitle = '';
      let followUpDate = '';
      let followUpTime = '';

      if (f.sopen && okI) {
        const recipients = f.sother && f.swho.length ? f.swho : [user?.id || ''];
        nextActionTitle = f.stx.trim();
        followUpDate = f.sd;
        followUpTime = f.stm;

        // Create tasks/reminders for each recipient
        for (const recipientId of recipients) {
          const recipientUser = team.find((u) => u.id === recipientId);
          const recipientName = recipientUser?.name || user?.name || 'Team';

          if (f.sk === 'Note') {
            await api.notes.create({
              title: f.stx.trim() || 'Stage Note',
              body: f.sbd.trim() || f.stx.trim(),
              clientId: client.id,
            });
            acts.push({
              id: 'act-note-' + Date.now(),
              kind: 'Note',
              title: f.stx.trim() || 'Note',
              body: f.sbd.trim(),
              who: recipientName,
              date: f.sd,
              time: f.stm,
            });
          } else {
            const createdTask: any = await api.tasks.create({
              title: f.stx.trim(),
              desc: f.note || '',
              date: f.sd || TODAY,
              time: f.stm || '09:00',
              whoUserId: recipientId,
              clientId: client.id,
              serviceId: service.id,
              type: f.sk,
            });
            acts.push({
              id: 'act-task-' + createdTask.id,
              kind: f.sk,
              title: f.stx.trim(),
              body: f.note,
              who: recipientName,
              tid: createdTask.id,
              date: f.sd,
              time: f.stm,
            });
          }
        }
      }

      await api.services.updateStage(service.id, {
        stageId: f.stageId,
        stageName,
        note: f.note,
        nextAction: nextActionTitle,
        followUpDate,
        followUpTime,
        assignUserId: f.sother && f.swho.length ? f.swho[0] : user?.id,
        keepCurrent: f.keep,
        acts,
      });

      if (!f.keep && selectedStage && (selectedStage.id === stages[stages.length - 1].id || /deliver|complet/i.test(selectedStage.name))) {
        celebrate('Congratulations!', `${service.name} for ${client.name} has progressed. Great work!`);
      }

      toast('Saved · stage update logged' + (acts.length ? ` · ${acts.length} item(s) assigned` : ''));
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error updating stage');
    }
  };

  const curStageName = stages.find((x) => x.id === service.curStageId)?.name || 'Current';

  return (
    <Modal title={`Update Stage · ${service.name}`} close={onClose}>
      <V style={{ gap: 12 }}>
        <V style={{ gap: 6 }}>
          <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>What happened?</span>
          <V style={{ flexDirection: 'row', gap: 8 }}>
            <B
              k={f.keep}
              style={{ flex: 1, whiteSpace: 'normal', textAlign: 'center', fontSize: 12, padding: '8px 6px', gap: 5, lineHeight: 1.2 }}
              onPress={() => sf({ ...f, keep: true, stageId: service.curStageId })}
            >
              <I n="tick" s={16} />Stay at {curStageName}
            </B>
            <B
              k={!f.keep}
              style={{ flex: 1, whiteSpace: 'normal', textAlign: 'center', fontSize: 12, padding: '8px 6px', gap: 5, lineHeight: 1.2 }}
              onPress={() => sf({ ...f, keep: false, stageId: nxt?.id || f.stageId })}
            >
              <I n="arrow" s={16} />Move to…
            </B>
          </V>
          {!f.keep && (
            <Sel style={inp} value={f.stageId} onChange={(e) => sf({ ...f, stageId: e.target.value })}>
              {opts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Sel>
          )}
        </V>

        <F l="Note">
          <textarea
            rows={2}
            placeholder="e.g. Client requested document update, awaiting signature"
            style={inp}
            value={f.note}
            onChange={(e) => sf({ ...f, note: e.target.value })}
          />
        </F>

        {/* Next Action Box */}
        <V style={{ gap: 8, padding: 12, borderRadius: 14, border: '1px solid ' + BD, background: '#f8fafc' }}>
          <P
            onPress={() => sf({ ...f, sopen: !f.sopen })}
            style={{ ...R, justifyContent: 'space-between', gap: 8 }}
          >
            <b style={{ fontSize: 13, color: '#0f172a' }}>Next action (optional)</b>
            <span style={{ color: G, fontWeight: 700, fontSize: 13 }}>{f.sopen ? 'Hide ▴' : 'Open ▾'}</span>
          </P>

          {f.sopen && (
            <V style={{ gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: MU }}>
                Create a reminder, task or note. Assign it to yourself or a colleague; assignments are added to their list, notifications and this client activity log.
              </span>

              {/* Type Switcher */}
              <V style={{ flexDirection: 'row', gap: 6 }}>
                {(['Reminder', 'Task', 'Note'] as const).map((k) => (
                  <P
                    key={k}
                    onPress={() => sf({ ...f, sk: k })}
                    style={{
                      ...chip(f.sk === k),
                      ...R,
                      gap: 6,
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    <I n={k === 'Reminder' ? 'bell' : k === 'Task' ? 'task' : 'note'} s={14} />
                    {k}
                  </P>
                ))}
              </V>

              {/* Title / Description */}
              <input
                style={inp}
                placeholder={f.sk === 'Note' ? 'Note title (optional)' : f.sk === 'Task' ? 'e.g. Prepare the proposal' : 'e.g. Call the client again'}
                value={f.stx}
                onChange={(e) => sf({ ...f, stx: e.target.value })}
              />

              {f.sk === 'Note' && (
                <textarea
                  rows={3}
                  placeholder="Write the note…"
                  style={{ ...inp, minHeight: 70 }}
                  value={f.sbd}
                  onChange={(e) => sf({ ...f, sbd: e.target.value })}
                />
              )}

              {/* Date & Time quick chips (for Reminder & Task) */}
              {f.sk !== 'Note' && (
                <V style={{ gap: 8 }}>
                  <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      ['Today', 0],
                      ['Tomorrow', 1],
                      ['3 days', 3],
                      ['1 week', 7],
                    ].map(([l, n]) => (
                      <P
                        key={l}
                        onPress={() => sf({ ...f, sd: add(n as number) })}
                        style={chip(f.sd === add(n as number))}
                      >
                        {l}
                      </P>
                    ))}
                  </V>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="date" style={inp} value={f.sd} onChange={(e) => sf({ ...f, sd: e.target.value })} />
                    <input type="time" style={inp} value={f.stm} onChange={(e) => sf({ ...f, stm: e.target.value })} />
                  </div>
                </V>
              )}

              {/* Assignee selection */}
              <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>Send to</span>
              <V style={{ flexDirection: 'row', gap: 8 }}>
                <B
                  k={!f.sother}
                  style={{ flex: 1 }}
                  onPress={() => sf({ ...f, sother: false, swho: [] })}
                >
                  <I n="user" s={16} />Myself
                </B>
                <B
                  k={f.sother}
                  style={{ flex: 1 }}
                  onPress={() => sf({ ...f, sother: true, swho: f.swho.length ? f.swho : [others[0]?.id].filter(Boolean) as string[] })}
                >
                  <I n="users" s={16} />Someone else
                </B>
              </V>

              {f.sother && (
                <V style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, color: MU }}>Select one or more colleagues</span>
                  <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {others.map((u) => {
                      const picked = f.swho.includes(u.id);
                      return (
                        <P
                          key={u.id}
                          onPress={() =>
                            sf({
                              ...f,
                              swho: picked ? f.swho.filter((x) => x !== u.id) : [...f.swho, u.id],
                            })
                          }
                          style={{
                            ...R,
                            gap: 6,
                            padding: '5px 12px 5px 6px',
                            borderRadius: 20,
                            fontWeight: 600,
                            fontSize: 13,
                            border: '1px solid ' + (picked ? G : BD),
                            background: picked ? '#f0fdf4' : '#fff',
                            color: picked ? G : MU,
                          }}
                        >
                          <Av n={u.name} s={22} url={u.avatarUrl} />
                          {u.name}
                          {picked && <I n="tick" s={13} />}
                        </P>
                      );
                    })}
                  </V>
                </V>
              )}
            </V>
          )}
        </V>

        <span style={{ fontSize: 12, color: MU }}>Saving logs this update in your Done tasks automatically.</span>
        <B k={1} onPress={save}>
          Save Update
        </B>
      </V>
    </Modal>
  );
};

// 5. Decision Form
export const DecideForm: React.FC<{
  client: any;
  service: any;
  decisionStageId?: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ client, service, decisionStageId, onClose, onSaved }) => {
  const { toast } = useAuth();
  const stages = service.stagesConfig as any[];
  const dec = stages.find((x) => x.type === 'decision' && (decisionStageId ? x.id === decisionStageId : true));
  const [out, setOut] = useState<string>(dec?.res || '');
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');

  if (!dec) return null;

  const save = async () => {
    if (!out) {
      toast(`Choose ${dec.yes || 'Accepted'} or ${dec.no || 'Rejected'}`);
      return;
    }
    try {
      await api.services.decide(service.id, {
        decisionStageId: dec.id,
        result: out,
        note,
        nextAction: next,
      });
      toast(out === 'yes' ? 'Accepted · advanced to next stage' : 'Rejected · pipeline updated');
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error saving decision');
    }
  };

  const btn = (k: string, label: string, ic: string, on: boolean, cl2: string, bg: string, tx: string) => (
    <P
      onPress={() => setOut(k)}
      style={{
        ...R,
        flex: 1,
        justifyContent: 'center',
        gap: 8,
        padding: '16px 10px',
        borderRadius: 14,
        fontWeight: 700,
        border: '1.5px solid ' + (on ? cl2 : BD),
        background: on ? bg : '#fff',
        color: on ? tx : MU,
      }}
    >
      <I n={ic} s={18} />
      {label}
    </P>
  );

  return (
    <Modal title={`Decision · ${service.name}`} close={onClose}>
      <V style={{ gap: 12 }}>
        <span style={{ fontSize: 12, color: MU }}>{client.name}</span>
        <V style={{ flexDirection: 'row', gap: 10 }}>
          {btn('yes', dec.yes || 'Accepted', 'tick', out === 'yes', '#16a34a', '#f0fdf4', '#166534')}
          {btn('no', dec.no || 'Rejected', 'x', out === 'no', '#ef4444', '#fef2f2', '#b91c1c')}
        </V>
        {out === 'yes' && <span style={{ fontSize: 12, color: '#166534' }}>Advances to the next stage automatically.</span>}
        {out === 'no' && <span style={{ fontSize: 12, color: '#b91c1c' }}>Pipeline stops here.</span>}
        <F l="Note">
          <textarea rows={2} placeholder="e.g. Client signed proposal" style={inp} value={note} onChange={(e) => setNote(e.target.value)} />
        </F>
        <F l="Next action (adds a reminder)">
          <input placeholder="e.g. Send invoice" style={inp} value={next} onChange={(e) => setNext(e.target.value)} />
        </F>
        <B k={1} onPress={save}>
          Save Decision
        </B>
      </V>
    </Modal>
  );
};
