import React, { useState } from 'react';
import { V, B, P, Modal, F, Sel, inp, G, MU, BD, TODAY, add } from '../Common';
import { I } from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

interface ReminderFormModalProps {
  clientId?: string;
  serviceId?: string;
  clients: any[];
  team: any[];
  onClose: () => void;
  onSaved: () => void;
}

export const ReminderFormModal: React.FC<ReminderFormModalProps> = ({
  clientId,
  serviceId,
  clients,
  team,
  onClose,
  onSaved,
}) => {
  const { user, toast } = useAuth();
  const others = team.filter((u) => u.id !== user?.id);

  // Initial time calculation matching prototype:
  // Round to next hour, or '09:00' if >= 22:00
  const initialTime = (() => {
    const d = new Date();
    if (d.getHours() >= 22) return '09:00';
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  })();

  const [f, sf] = useState({
    title: '',
    note: '',
    cid: clientId || '',
    sid: serviceId || '',
    date: TODAY,
    time: initialTime,
    whoUserId: user?.id || '',
    other: false,
  });

  const selectedClient = clients.find((x) => x.id === f.cid);
  const clientServices = selectedClient?.services || [];

  const chip = (on: boolean) => ({
    padding: '7px 12px',
    borderRadius: 20,
    fontWeight: 600,
    fontSize: 13,
    border: '1px solid ' + (on ? G : BD),
    background: on ? '#f0fdf4' : '#fff',
    color: on ? G : MU,
    cursor: 'pointer',
  });

  const save = async () => {
    if (!f.title.trim()) {
      toast('Write what to remember');
      return;
    }

    try {
      await api.tasks.create({
        title: f.title.trim(),
        desc: f.note.trim(),
        date: f.date,
        time: f.time || '09:00',
        whoUserId: f.other ? f.whoUserId : user?.id,
        clientId: f.cid || null,
        serviceId: f.sid || null,
        type: 'Reminder',
        note: f.note.trim(),
      });
      toast('Reminder added');
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error creating reminder');
    }
  };

  return (
    <Modal title="Add Reminder" close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Remind me to">
          <input
            style={inp}
            placeholder="e.g. Call back about the licence"
            value={f.title}
            onChange={(e) => sf((v) => ({ ...v, title: e.target.value }))}
            autoFocus
          />
        </F>

        <F l="Client (optional)">
          <Sel
            style={inp}
            value={f.cid}
            onChange={(e) => sf((v) => ({ ...v, cid: e.target.value, sid: '' }))}
          >
            <option value="">No client · just for me</option>
            {clients.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Sel>
        </F>

        {selectedClient && clientServices.length > 0 && (
          <F l="Pipeline service (optional)">
            <Sel
              style={inp}
              value={f.sid}
              onChange={(e) => sf((v) => ({ ...v, sid: e.target.value }))}
            >
              <option value="">General</option>
              {clientServices.map((x: any) => {
                const curStage = (x.stages || []).find((s: any) => s.id === x.curStageId);
                const stageName = curStage ? curStage.name : '';
                return (
                  <option key={x.id} value={x.id}>
                    {x.name}{stageName ? ` · ${stageName}` : ''}
                  </option>
                );
              })}
            </Sel>
          </F>
        )}

        {/* Quick Date Presets */}
        <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['Today', 0],
            ['Tomorrow', 1],
            ['3 days', 3],
            ['1 week', 7],
          ].map(([l, n]: any) => (
            <P
              key={l}
              onPress={() => sf((v) => ({ ...v, date: add(n) }))}
              style={chip(f.date === add(n))}
            >
              {l}
            </P>
          ))}
        </V>

        {/* Date and Time Pickers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input
            type="date"
            style={inp}
            value={f.date}
            onChange={(e) => sf((v) => ({ ...v, date: e.target.value }))}
          />
          <input
            type="time"
            style={inp}
            value={f.time}
            onChange={(e) => sf((v) => ({ ...v, time: e.target.value }))}
          />
        </div>

        {/* Quick Time Presets */}
        <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['Morning', '09:00'],
            ['Afternoon', '14:00'],
            ['Evening', '18:00'],
          ].map(([l, t]) => (
            <P
              key={l}
              onPress={() => sf((v) => ({ ...v, time: t }))}
              style={chip(f.time === t)}
            >
              {l}
            </P>
          ))}
        </V>

        <F l="Note (optional)">
          <input
            style={inp}
            placeholder="Add any extra notes..."
            value={f.note}
            onChange={(e) => sf((v) => ({ ...v, note: e.target.value }))}
          />
        </F>

        {/* Assignee Switcher */}
        <V style={{ flexDirection: 'row', gap: 8 }}>
          <B
            k={!f.other}
            style={{ flex: 1 }}
            onPress={() => sf((v) => ({ ...v, other: false, whoUserId: user?.id || '' }))}
          >
            <I n="user" s={16} />Myself
          </B>
          <B
            k={f.other}
            style={{ flex: 1 }}
            onPress={() => sf((v) => ({ ...v, other: true, whoUserId: others[0]?.id || user?.id || '' }))}
          >
            <I n="users" s={16} />Someone else
          </B>
        </V>

        {f.other && (
          others.length ? (
            <V style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {others.map((u) => (
                <P
                  key={u.id}
                  onPress={() => sf((v) => ({ ...v, whoUserId: u.id }))}
                  style={chip(f.whoUserId === u.id)}
                >
                  {u.name}
                </P>
              ))}
            </V>
          ) : (
            <span style={{ fontSize: 12, color: MU }}>No other colleagues found.</span>
          )
        )}

        <B k={1} onPress={save}>
          <I n="bell" s={16} />Add Reminder
        </B>
      </V>
    </Modal>
  );
};
