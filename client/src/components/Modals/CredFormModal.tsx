import React, { useState } from 'react';
import { V, F, B, Modal, inp, MU } from '../Common';
import { I } from '../Icons';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

interface CredFormModalProps {
  member: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const CredFormModal: React.FC<CredFormModalProps> = ({ member, onClose, onSuccess }) => {
  const { toast } = useAuth();
  const [form, setForm] = useState({
    name: member.name,
    email: member.email,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Name is required');
      return;
    }
    if (!form.email.trim()) {
      toast('Email is required');
      return;
    }
    if (form.password && form.password.length < 6) {
      toast('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.users.update(member.id, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password ? form.password : undefined,
      });
      toast(`Credentials updated for ${member.name}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit Credentials · ${member.name}`} close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Full Name *">
          <input
            style={inp}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </F>

        <F l="Login Email *">
          <input
            type="email"
            style={inp}
            autoComplete="off"
            autoCapitalize="none"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </F>

        <F l="Change Password (leave blank to keep current)">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              style={{ ...inp, paddingRight: 40 }}
              placeholder="Enter new password (min. 6 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                cursor: 'pointer',
                color: MU,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <I n="eye" s={16} />
            </div>
          </div>
        </F>

        <B k={1} onPress={handleSave} style={{ marginTop: 6, opacity: loading ? 0.6 : 1 }}>
          <I n="lock" s={16} />
          {loading ? 'Saving...' : 'Save Credentials'}
        </B>
      </V>
    </Modal>
  );
};
