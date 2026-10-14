import React, { useRef } from 'react';
import { V, R, P, B, IB, Av, card, G, MU, BD } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const SettingsPage: React.FC<{
  team: any[];
  onRefreshTeam: () => void;
  onOpenModal: (type: string, data?: any) => void;
}> = ({ team, onRefreshTeam, onOpenModal }) => {
  const { user, settings, updateSettings, logout, toast } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMgmt = settings?.viewMode === 'management';
  const hasMgmtAccess = user?.role === 'management';

  const toggleRole = async (u: any) => {
    if (!hasMgmtAccess) {
      toast('Only management can change roles');
      return;
    }
    const newRole = u.role === 'management' ? 'employee' : 'management';
    if (newRole === 'employee') {
      const mgmtCount = team.filter((m) => m.role === 'management').length;
      if (mgmtCount <= 1 && u.role === 'management') {
        toast('Cannot demote the only management user');
        return;
      }
    }
    try {
      await api.users.updateRole(u.id, newRole);
      toast(`Updated ${u.name}'s role to ${newRole}`);
      onRefreshTeam();
    } catch (e: any) {
      toast(e.message || 'Failed to update role');
    }
  };

  const deleteUser = async (u: any) => {
    if (u.id === user?.id) {
      toast('Cannot remove yourself');
      return;
    }
    try {
      await api.users.delete(u.id);
      toast(`${u.name} removed`);
      onRefreshTeam();
    } catch (e: any) {
      toast('Failed to remove employee');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.users.uploadAvatar(file);
      toast('Profile photo updated');
      window.location.reload();
    } catch (e: any) {
      toast('Failed to upload photo');
    }
  };

  return (
    <V style={{ gap: 12 }}>
      <b style={{ fontSize: 18 }}>Settings</b>

      {/* User profile card with avatar upload */}
      <V style={{ ...card, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label style={{ position: 'relative', cursor: 'pointer', display: 'flex' }}>
            <Av n={user?.name || 'User'} s={56} url={user?.avatarUrl} />
            <span
              style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: G,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
              }}
            >
              <I n="camera" s={11} />
            </span>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </label>
          <V style={{ gap: 4, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <b style={{ fontSize: 17 }}>{user?.name}</b>
              <B onPress={() => onOpenModal('emp', user)} style={{ padding: '4px 10px', fontSize: 12, gap: 5 }}>
                <I n="edit" s={14} /> Edit Profile & Password
              </B>
            </div>
            <span style={{ color: MU, fontSize: 12 }}>{user?.email}</span>
            <span
              style={{
                alignSelf: 'flex-start',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                marginTop: 2,
                color: hasMgmtAccess ? '#166534' : '#475569',
                background: hasMgmtAccess ? '#dcfce7' : '#f1f5f9',
              }}
            >
              {hasMgmtAccess ? 'Management Access' : 'Employee Access'}
            </span>
          </V>
        </div>
      </V>

      {/* View Mode */}
      <V style={{ ...card, gap: 10 }}>
        <b>View mode</b>
        <span style={{ fontSize: 12, color: MU }}>Switch between the management view and the employee view.</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['management', 'Management', "All clients, all tasks and every employee's reports", '#16a34a'],
            ['employee', 'Employee', 'Only my clients, my tasks and my reports', '#2563eb'],
          ].map(([k, l, d2, co]) => {
            const on = (k === 'management') === isMgmt;
            const lock = k === 'management' && !hasMgmtAccess;
            return (
              <P
                key={k}
                onPress={() => {
                  if (lock) {
                    toast('Your account needs management access for this view');
                    return;
                  }
                  updateSettings({ viewMode: k as any });
                }}
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 5,
                  padding: 12,
                  borderRadius: 14,
                  border: '1.5px solid ' + (on ? co : BD),
                  background: on ? co + '14' : '#fff',
                  opacity: lock ? 0.5 : 1,
                  textAlign: 'left',
                }}
              >
                <V style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <b style={{ color: on ? co : '#0f172a' }}>{l}</b>
                  {on && (
                    <span style={{ color: co, display: 'flex' }}>
                      <I n="tick" s={15} />
                    </span>
                  )}
                </V>
                <span style={{ fontSize: 12, color: MU, lineHeight: 1.35 }}>{d2}</span>
              </P>
            );
          })}
        </div>
      </V>

      {/* Team */}
      <V style={{ ...card, gap: 10 }}>
        <b>Team</b>
        <span style={{ fontSize: 12, color: MU }}>Management sees all clients, tasks and reports. Tap a role to toggle it, or tap a row to edit.</span>
        {team.map((u) => (
          <V
            key={u.id}
            style={{
              ...R,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 10,
            }}
          >
            <Av n={u.name} url={u.avatarUrl} />
            <div
              style={{ flex: 1, minWidth: 0, cursor: hasMgmtAccess || u.id === user?.id ? 'pointer' : 'default' }}
              onClick={() => {
                if (hasMgmtAccess || u.id === user?.id) {
                  onOpenModal('emp', u);
                }
              }}
              title={hasMgmtAccess || u.id === user?.id ? 'Click to view/edit user details' : u.name}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {u.name}
                {u.id === user?.id ? ' (you)' : ''}
              </div>
              <div style={{ fontSize: 11, color: MU, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.email}
              </div>
            </div>
            <P
              onPress={() => toggleRole(u)}
              title={hasMgmtAccess ? 'Tap to toggle role' : 'Account role'}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
                cursor: hasMgmtAccess ? 'pointer' : 'default',
                color: u.role === 'management' ? '#166534' : '#475569',
                background: u.role === 'management' ? '#dcfce7' : '#f1f5f9',
              }}
            >
              {u.role === 'management' ? 'Management' : 'Employee'}
            </P>
            {(hasMgmtAccess || u.id === user?.id) && (
              <IB n="edit" onPress={() => onOpenModal('emp', u)} title="Edit user" />
            )}
            {u.id !== user?.id && hasMgmtAccess && <IB n="trash" onPress={() => deleteUser(u)} title="Delete user" />}
          </V>
        ))}
        {hasMgmtAccess && (
          <B onPress={() => onOpenModal('emp')}>
            <I n="plus" s={16} />Add Employee
          </B>
        )}
      </V>

      {/* Logout */}
      <V style={{ ...card, padding: 12 }}>
        <B onPress={logout} style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2', justifyContent: 'center', padding: '10px 16px' }}>
          <I n="out" s={16} />Log out
        </B>
      </V>
    </V>
  );
};
