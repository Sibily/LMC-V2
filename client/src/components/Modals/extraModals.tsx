import React, { useState } from 'react';
import { V, R, P, B, IB, F, Sel, Av, Modal, inp, card, G, MU, BD, TODAY, add, COL, col } from '../Common';
import { I } from '../Icons';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// 6. People Modal
export const PeopleModal: React.FC<{
  client: any;
  team: any[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ client, team, onClose, onSaved }) => {
  const { toast } = useAuth();
  const [selectedUser, setSelectedUser] = useState('');
  const [permission, setPermission] = useState('Viewer');

  const existingMemberIds = (client.members || []).map((m: any) => m.userId);
  const freeUsers = team.filter((u) => u.id !== client.ownerId && !existingMemberIds.includes(u.id));

  const addPerson = async () => {
    const uid = selectedUser || freeUsers[0]?.id;
    if (!uid) return;
    try {
      await api.clients.addMember(client.id, uid, permission);
      toast('Person added to client');
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Error adding person');
    }
  };

  const removePerson = async (userId: string) => {
    try {
      await api.clients.removeMember(client.id, userId);
      toast('Person removed');
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Error removing person');
    }
  };

  return (
    <Modal title="Add People" close={onClose}>
      <V style={{ gap: 10 }}>
        <V style={{ ...R, flexDirection: 'row', gap: 10 }}>
          <Av n={client.owner?.name || 'Owner'} url={client.owner?.avatarUrl} />
          <span style={{ flex: 1 }}>{client.owner?.name || 'Owner'}</span>
          <span style={{ color: MU }}>Owner</span>
        </V>

        {(client.members || []).map((m: any) => (
          <V key={m.userId} style={{ ...R, flexDirection: 'row', gap: 10 }}>
            <Av n={m.user?.name || 'User'} url={m.user?.avatarUrl} />
            <span style={{ flex: 1 }}>{m.user?.name}</span>
            <span style={{ color: MU, fontSize: 13 }}>{m.permission}</span>
            <IB n="trash" onPress={() => removePerson(m.userId)} />
          </V>
        ))}

        {freeUsers.length > 0 && (
          <V style={{ gap: 8, borderTop: '1px solid ' + BD, paddingTop: 12 }}>
            <F l="Choose person">
              <Sel style={inp} value={selectedUser || freeUsers[0]?.id} onChange={(e) => setSelectedUser(e.target.value)}>
                {freeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Sel>
            </F>
            <F l="Permission">
              <Sel style={inp} value={permission} onChange={(e) => setPermission(e.target.value)}>
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
              </Sel>
            </F>
            <B k={1} onPress={addPerson}>
              Add Person
            </B>
          </V>
        )}
      </V>
    </Modal>
  );
};

// 7. Customize Pipeline
export const CustPipelineModal: React.FC<{
  service?: any;
  isDefault?: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ service, isDefault, onClose, onSaved }) => {
  const { toast } = useAuth();
  const [stages, setStages] = useState<any[]>(service ? service.stagesConfig : []);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= stages.length) return;
    const n = [...stages];
    n.splice(to, 0, n.splice(from, 1)[0]);
    setStages(n);
  };

  const addNormalStage = () => {
    const id = 'st_' + Math.random().toString(36).substring(2, 8);
    setStages([...stages, { id, name: 'New Stage', type: 'stage', color: '#16a34a' }]);
  };

  const addDecisionStage = () => {
    const id = 'dec_' + Math.random().toString(36).substring(2, 8);
    setStages([
      ...stages,
      { id, name: 'Accepted / Rejected', type: 'decision', yes: 'Accepted', no: 'Rejected', color: '#16a34a' },
    ]);
  };

  const save = async () => {
    try {
      if (isDefault) {
        await api.pipelines.updateDefault(stages);
        toast('Default pipeline updated');
      } else if (service) {
        await api.services.customizePipeline(service.id, stages);
        toast('Service pipeline saved');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error saving pipeline');
    }
  };

  return (
    <Modal title={isDefault ? 'Default Pipeline' : 'Customize Pipeline'} close={onClose}>
      <V style={{ gap: 10 }}>
        <span style={{ color: MU, fontSize: 12 }}>
          {isDefault ? 'New services start with this flow.' : `Applies only to ${service?.name}.`} Reorder stages, pick colors, or add decisions.
        </span>

        {stages.map((x, i) =>
          x.type === 'decision' ? (
            <div
              key={x.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                border: '1px solid ' + BD,
                borderRadius: 10,
                padding: '4px 6px 10px',
                background: '#fafcfb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: MU, display: 'flex' }}>
                  <I n="grip" s={18} />
                </span>
                <span style={{ width: 12, height: 12, borderRadius: 4, border: '1.5px dashed #94a3b8', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: MU }}>Decision · accept or reject</span>
                <IB n="up" onPress={() => move(i, i - 1)} />
                <IB n="down" onPress={() => move(i, i + 1)} />
                <IB n="trash" onPress={() => stages.length > 1 && setStages(stages.filter((y) => y.id !== x.id))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 4px 0 26px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #bbf7d0', borderRadius: 10, padding: '0 10px', background: '#fff' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: '#16a34a', flexShrink: 0 }} />
                  <input
                    style={{ border: 0, outline: 'none', padding: '9px 0', flex: 1, background: 'transparent' }}
                    value={x.yes || 'Accepted'}
                    onChange={(e) => setStages(stages.map((y) => (y.id === x.id ? { ...y, yes: e.target.value } : y)))}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #fecaca', borderRadius: 10, padding: '0 10px', background: '#fff' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444', flexShrink: 0 }} />
                  <input
                    style={{ border: 0, outline: 'none', padding: '9px 0', flex: 1, background: 'transparent' }}
                    value={x.no || 'Rejected'}
                    onChange={(e) => setStages(stages.map((y) => (y.id === x.id ? { ...y, no: e.target.value } : y)))}
                  />
                </label>
              </div>
            </div>
          ) : (
            <React.Fragment key={x.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid ' + BD,
                  borderRadius: 10,
                  padding: '4px 6px',
                  background: '#fff',
                }}
              >
                <span style={{ color: MU, display: 'flex' }}>
                  <I n="grip" s={18} />
                </span>
                <P
                  title="Change colour"
                  onPress={() => setActivePickerId(activePickerId === x.id ? null : x.id)}
                  style={{ width: 22, height: 22, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: 7, background: x.color || col(i) }} />
                </P>
                <input
                  style={{ ...inp, border: 0, padding: '8px 4px', flex: 1 }}
                  value={x.name}
                  onChange={(e) => setStages(stages.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)))}
                />
                <IB n="up" onPress={() => move(i, i - 1)} />
                <IB n="down" onPress={() => move(i, i + 1)} />
                <IB n="trash" onPress={() => stages.length > 1 && setStages(stages.filter((y) => y.id !== x.id))} />
              </div>
              {activePickerId === x.id && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '2px 8px 6px 34px' }}>
                  {COL.map((cc) => (
                    <P
                      key={cc}
                      onPress={() => {
                        setStages(stages.map((y) => (y.id === x.id ? { ...y, color: cc } : y)));
                        setActivePickerId(null);
                      }}
                      style={{ width: 26, height: 26, borderRadius: 13, background: cc, color: '#fff', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {(x.color || col(i)) === cc && <I n="tick" s={14} />}
                    </P>
                  ))}
                </div>
              )}
            </React.Fragment>
          )
        )}

        <V style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <B style={{ flex: 1 }} onPress={addNormalStage}>
            <I n="plus" s={16} />Add Stage
          </B>
          <B style={{ flex: 1, whiteSpace: 'normal', textAlign: 'center' }} onPress={addDecisionStage}>
            <I n="plus" s={16} />Accept / Reject
          </B>
        </V>

        <B k={1} onPress={save}>
          Save Pipeline
        </B>
      </V>
    </Modal>
  );
};

// 8. Note Form
export const NoteForm: React.FC<{
  note?: any;
  clientId?: string;
  clients: any[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ note, clientId, clients, onClose, onSaved }) => {
  const { toast } = useAuth();
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [cid, setCid] = useState(note?.clientId || clientId || '');

  const save = async () => {
    if (!title.trim() && !body.trim()) {
      toast('Write a note first');
      return;
    }
    try {
      if (note?.id) {
        await api.notes.update(note.id, { title: title.trim(), body: body.trim(), clientId: cid || null });
        toast('Note updated');
      } else {
        await api.notes.create({ title: title.trim(), body: body.trim(), clientId: cid || null });
        toast('Note saved');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error saving note');
    }
  };

  const remove = async () => {
    if (!note?.id) return;
    try {
      await api.notes.delete(note.id);
      toast('Note deleted');
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error deleting note');
    }
  };

  return (
    <Modal title={note ? 'Edit Note' : 'Add Note'} close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Note title (optional)">
          <input style={inp} placeholder="e.g. Client preferences" value={title} onChange={(e) => setTitle(e.target.value)} />
        </F>
        <F l="Note">
          <textarea rows={5} style={inp} placeholder="Write your note here..." value={body} onChange={(e) => setBody(e.target.value)} />
        </F>
        <F l="Client (optional)">
          <Sel style={inp} value={cid} onChange={(e) => setCid(e.target.value)}>
            <option value="">Personal note</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Sel>
        </F>
        <V style={{ flexDirection: 'row', gap: 8 }}>
          {note && (
            <B onPress={remove} style={{ color: '#dc2626', flex: '0 0 auto' }}>
              <I n="trash" s={16} />Delete
            </B>
          )}
          <B k={1} style={{ flex: 1 }} onPress={save}>
            <I n="note" s={16} />
            {note ? 'Save Changes' : 'Save Note'}
          </B>
        </V>
      </V>
    </Modal>
  );
};

// 9. Communication Form
export const CommunicationForm: React.FC<{
  clientId: string;
  comm?: any;
  team: any[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ clientId, comm, team, onClose, onSaved }) => {
  const { user, toast } = useAuth();
  const [type, setType] = useState(comm?.type || 'WhatsApp message');
  const [byUserId, setByUserId] = useState(comm?.byUserId || user?.id);
  const [withUserIds, setWithUserIds] = useState<string[]>(comm?.withUserIds || []);
  const [date, setDate] = useState(comm?.date || TODAY);
  const [time, setTime] = useState(comm?.time || new Date().toTimeString().slice(0, 5));
  const [details, setDetails] = useState(comm?.details || '');

  // Follow-up state
  const [fuEnabled, setFuEnabled] = useState(!!comm?.followDate);
  const [fuType, setFuType] = useState(comm?.followType || 'Task');
  const [fuDate, setFuDate] = useState(comm?.followDate || add(1));
  const [fuTime, setFuTime] = useState(comm?.followTime || '09:00');
  const [fuWhat, setFuWhat] = useState('');

  const save = async () => {
    if (!details.trim()) {
      toast('Add communication details first');
      return;
    }
    try {
      const payload = {
        type,
        byUserId,
        withUserIds,
        date,
        time,
        details: details.trim(),
        followUp: {
          enabled: fuEnabled,
          type: fuType,
          date: fuDate,
          time: fuTime,
          what: fuWhat,
        },
      };

      if (comm?.id) {
        await api.comms.update(comm.id, payload);
        toast('Communication updated');
      } else {
        await api.comms.create(clientId, payload);
        toast('Communication logged');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error saving communication');
    }
  };

  return (
    <Modal title={comm ? 'Edit Communication' : 'Add Communication'} close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Communication type">
          <Sel style={inp} value={type} onChange={(e) => setType(e.target.value)}>
            {['WhatsApp message', 'Email', 'Phone call', 'Meeting', 'Internal note', 'Other'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Sel>
        </F>
        <F l="Handled by">
          <Sel style={inp} value={byUserId} onChange={(e) => setByUserId(e.target.value)}>
            {team.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Sel>
        </F>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <F l="Date">
            <input type="date" style={inp} value={date} onChange={(e) => setDate(e.target.value)} />
          </F>
          <F l="Time">
            <input type="time" style={inp} value={time} onChange={(e) => setTime(e.target.value)} />
          </F>
        </div>
        <F l="Details">
          <textarea rows={3} style={inp} placeholder="What was discussed?" value={details} onChange={(e) => setDetails(e.target.value)} />
        </F>

        {fuEnabled ? (
          <V style={{ ...card, gap: 10, padding: 12 }}>
            <V style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>Follow-up Task</b>
              <IB n="x" onPress={() => setFuEnabled(false)} />
            </V>
            <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {['Task', 'Reminder', 'Call', 'Meeting'].map((t) => (
                <P
                  key={t}
                  onPress={() => setFuType(t)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 13,
                    border: '1px solid ' + (fuType === t ? G : BD),
                    background: fuType === t ? '#f0fdf4' : '#fff',
                    color: fuType === t ? G : MU,
                  }}
                >
                  {t}
                </P>
              ))}
            </V>
            <F l="What to do">
              <input
                style={inp}
                placeholder={fuType === 'Call' ? 'e.g. Call client back' : 'e.g. Send documents list'}
                value={fuWhat}
                onChange={(e) => setFuWhat(e.target.value)}
              />
            </F>

            {/* Quick date chips */}
            <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['Today', 0],
                ['Tomorrow', 1],
                ['3 days', 3],
                ['1 week', 7],
              ].map(([l, n]: any) => (
                <P
                  key={l}
                  onPress={() => setFuDate(add(n))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 13,
                    border: '1px solid ' + (fuDate === add(n) ? G : BD),
                    background: fuDate === add(n) ? '#f0fdf4' : '#fff',
                    color: fuDate === add(n) ? G : MU,
                  }}
                >
                  {l}
                </P>
              ))}
            </V>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" style={inp} value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
              <input type="time" style={inp} value={fuTime} onChange={(e) => setFuTime(e.target.value)} />
            </div>

            {/* Quick time chips */}
            <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['Morning', '09:00'],
                ['Afternoon', '14:00'],
                ['Evening', '18:00'],
              ].map(([l, t]) => (
                <P
                  key={l}
                  onPress={() => setFuTime(t)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 13,
                    border: '1px solid ' + (fuTime === t ? G : BD),
                    background: fuTime === t ? '#f0fdf4' : '#fff',
                    color: fuTime === t ? G : MU,
                  }}
                >
                  {l}
                </P>
              ))}
            </V>
          </V>
        ) : (
          <B onPress={() => setFuEnabled(true)}>
            <I n="plus" s={16} />Add follow-up (task, reminder, call)
          </B>
        )}

        <B k={1} onPress={save}>
          {comm ? 'Save Changes' : 'Save Communication'}
        </B>
      </V>
    </Modal>
  );
};

// 10. Employee Add/Edit/View Modal
export const EmpModal: React.FC<{
  user?: any;
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, onClose, onSaved }) => {
  const { user: currentUser, toast, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isMgmt, setIsMgmt] = useState(user?.role === 'management');
  const [saving, setSaving] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ n: string; em: string; pw: string; isEdit?: boolean } | null>(null);

  const isSelf = currentUser?.id === user?.id;
  const isManager = currentUser?.role === 'management';
  const canChangeRole = isManager;
  const canDelete = isManager && !isSelf && !!user?.id;

  if (user && !isSelf && !isManager) {
    return (
      <Modal close={onClose} title="Access Restricted">
        <V style={{ padding: 24, gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>
            Only management can view or edit other team members.
          </span>
          <B onPress={onClose} style={{ marginTop: 8 }}>
            Close
          </B>
        </V>
      </Modal>
    );
  }

  const genPw = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
    let res = '';
    for (let i = 0; i < 10; i++) res += chars[Math.floor(Math.random() * chars.length)];
    setPw(res);
    setShowPw(true);
  };

  const save = async () => {
    if (user?.id && !isSelf && !isManager) {
      toast('Permission denied');
      return;
    }
    const n = name.trim();
    if (!n) {
      toast('Enter employee name');
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast('Enter login email');
      return;
    }
    if (!user && pw.trim().length < 6) {
      toast('Password needs at least 6 characters');
      return;
    }
    if (user && pw.trim() && pw.trim().length < 6) {
      toast('New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      if (user?.id) {
        const payload: { name: string; email: string; password?: string; role?: string } = {
          name: n,
          email: cleanEmail,
        };
        if (pw.trim()) {
          payload.password = pw.trim();
        }
        if (canChangeRole) {
          payload.role = isMgmt ? 'management' : 'employee';
        }

        await api.users.update(user.id, payload);

        if (isSelf) {
          await refreshUser();
        }
        onSaved();

        if (pw.trim()) {
          setCreatedInfo({ n, em: cleanEmail, pw: pw.trim(), isEdit: true });
          toast('Employee credentials updated');
        } else {
          toast('Employee details saved');
          onClose();
        }
      } else {
        await api.users.create({
          name: n,
          email: cleanEmail,
          password: pw.trim(),
          role: isMgmt ? 'management' : 'employee',
        });
        setCreatedInfo({ n, em: cleanEmail, pw: pw.trim(), isEdit: false });
        toast('Employee created');
        onSaved();
      }
    } catch (e: any) {
      toast(e.message || 'Error saving employee');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async () => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This will remove their account permanently.`)) {
      return;
    }
    setSaving(true);
    try {
      await api.users.delete(user.id);
      toast(`${user.name} removed`);
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Failed to remove employee');
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    if (!createdInfo) return;
    const t = `Buzzrdesk login\nName: ${createdInfo.n}\nEmail: ${createdInfo.em}\nPassword: ${createdInfo.pw}`;
    navigator.clipboard.writeText(t).then(
      () => toast('Login details copied'),
      () => toast('Could not copy')
    );
  };

  if (createdInfo) {
    return (
      <Modal title={createdInfo.isEdit ? 'Credentials Updated' : 'Employee Added'} close={onClose}>
        <V style={{ gap: 12 }}>
          <span style={{ color: MU }}>
            {createdInfo.isEdit
              ? `Login credentials for ${createdInfo.n} have been updated:`
              : `Share these login details with ${createdInfo.n}:`}
          </span>
          <V style={{ ...card, gap: 8, padding: 12 }}>
            <V>
              <span style={{ fontSize: 11, color: MU }}>Email</span>
              <b>{createdInfo.em}</b>
            </V>
            <V>
              <span style={{ fontSize: 11, color: MU }}>Password</span>
              <b>{createdInfo.pw}</b>
            </V>
          </V>
          <B onPress={copy}>
            <I n="report" s={16} />Copy login details
          </B>
          <B k={1} onPress={onClose}>
            Done
          </B>
        </V>
      </Modal>
    );
  }

  return (
    <Modal title={user ? `Edit ${user.name}` : 'Add Employee'} close={onClose}>
      <V style={{ gap: 12 }}>
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid ' + BD,
            }}
          >
            <Av n={name || user.name} url={user.avatarUrl} s={40} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>
                {name || user.name}
                {isSelf ? ' (you)' : ''}
              </b>
              <span style={{ fontSize: 12, color: MU, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {email || user.email}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                color: isMgmt ? '#166534' : '#475569',
                background: isMgmt ? '#dcfce7' : '#f1f5f9',
              }}
            >
              {isMgmt ? 'Management' : 'Employee'}
            </span>
          </div>
        )}

        <F l="Full Name">
          <input
            style={inp}
            placeholder="e.g. Layla Hassan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </F>

        <F l="Login Email">
          <input
            style={inp}
            type="email"
            placeholder="name@company.ae"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </F>

        <F l={user ? 'Change Password' : 'Password'}>
          <V style={{ gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                type={showPw ? 'text' : 'password'}
                placeholder={user ? 'Leave blank to keep current' : 'Min 6 characters'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <B onPress={() => setShowPw(!showPw)} title={showPw ? 'Hide' : 'Show'}>
                <I n={showPw ? 'x' : 'eye'} s={16} />
              </B>
              <B onPress={genPw} title="Generate random password">
                Generate
              </B>
            </div>
            {user && (
              <span style={{ fontSize: 11, color: MU }}>
                Leave password blank to keep current password unchanged.
              </span>
            )}
          </V>
        </F>

        <F l="Access Role">
          <V style={{ gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <P
                onPress={() => canChangeRole && setIsMgmt(false)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1.5px solid ' + (!isMgmt ? G : BD),
                  background: !isMgmt ? '#f0fdf4' : '#fff',
                  color: !isMgmt ? G : MU,
                  textAlign: 'center',
                  cursor: canChangeRole ? 'pointer' : 'default',
                  opacity: canChangeRole ? 1 : 0.7,
                }}
              >
                Employee
              </P>
              <P
                onPress={() => canChangeRole && setIsMgmt(true)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1.5px solid ' + (isMgmt ? G : BD),
                  background: isMgmt ? '#dcfce7' : '#fff',
                  color: isMgmt ? '#166534' : MU,
                  textAlign: 'center',
                  cursor: canChangeRole ? 'pointer' : 'default',
                  opacity: canChangeRole ? 1 : 0.7,
                }}
              >
                Management
              </P>
            </div>
            {!canChangeRole && (
              <span style={{ fontSize: 11, color: MU }}>
                Only management accounts can change roles.
              </span>
            )}
          </V>
        </F>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <B
            k={1}
            onPress={() => !saving && save()}
            style={{
              flex: 1,
              justifyContent: 'center',
              opacity: saving ? 0.6 : 1,
              pointerEvents: saving ? 'none' : 'auto',
            }}
          >
            <I n={user ? 'tick' : 'plus'} s={16} />
            {saving ? 'Saving…' : user ? 'Save Changes' : 'Add Employee'}
          </B>
          {canDelete && (
            <B
              onPress={() => !saving && deleteEmployee()}
              style={{
                color: '#ef4444',
                borderColor: '#fca5a5',
                opacity: saving ? 0.6 : 1,
                pointerEvents: saving ? 'none' : 'auto',
              }}
            >
              <I n="trash" s={16} /> Delete
            </B>
          )}
        </div>
      </V>
    </Modal>
  );
};
