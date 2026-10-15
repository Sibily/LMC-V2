import React, { useState } from 'react';
import { V, B, P, MU, BD, fmt, ago } from '../Common';
import { I } from '../Icons';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../types';

// Modal 1: Confirm Moving Client to Recently Deleted
export const DeleteClientConfirmModal: React.FC<{
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ client, onClose, onSuccess }) => {
  const { toast } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.clients.delete(client.id);
      toast(`${client.name} moved to Recently deleted`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to delete client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(15,23,42,.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 24px 70px rgba(15,23,42,.28)',
          padding: 24,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <I n="trash" s={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 17, color: '#0f172a', display: 'block' }}>Delete client?</b>
            <span style={{ fontSize: 12.5, color: MU }}>{client.name}</span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
          This client will be moved to <b>Recently deleted clients</b> where management can view, restore, or permanently remove it.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <B onPress={onClose} style={{ padding: '9px 16px', background: '#f1f5f9', border: '1px solid ' + BD }}>
            Cancel
          </B>
          <B
            onPress={handleDelete}
            style={{
              padding: '9px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <I n="trash" s={15} />
            {loading ? 'Deleting...' : 'Move to Recently deleted'}
          </B>
        </div>
      </div>
    </div>
  );
};

// Modal 2: Deleted Client Profile Preview with Restore & Permanent Delete actions
export const DeletedClientProfileModal: React.FC<{
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
  onTriggerPermanentDelete: (client: Client) => void;
}> = ({ client, onClose, onSuccess, onTriggerPermanentDelete }) => {
  const { toast } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      await api.clients.restore(client.id);
      toast(`${client.name} restored to active clients`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to restore client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(15,23,42,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 24px 70px rgba(15,23,42,.28)',
          padding: 24,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Recently Deleted Client
            </span>
            <b style={{ fontSize: 20, display: 'block', color: '#0f172a' }}>{client.name}</b>
            <span style={{ fontSize: 12.5, color: MU }}>
              {client.company || client.type} {client.loc ? `· ${client.loc}` : ''}
            </span>
          </div>
          <P onPress={onClose} style={{ color: MU, padding: 4 }}>
            <I n="close" s={20} />
          </P>
        </div>

        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px' }}>
          <span style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.4 }}>
            Deleted {client.deletedAt ? ago(client.deletedAt.slice(0, 10)) : ''}
            {client.deletedByUser ? ` by ${client.deletedByUser.name}` : ''}.
            All associated services, documents, and history remain intact.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: MU }}>Phone</span>
            <b>{client.phone || '—'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: MU }}>Email</span>
            <b>{client.email || '—'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: MU }}>Services</span>
            <b>{(client.services || []).length} active</b>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
          <B
            onPress={() => {
              onClose();
              onTriggerPermanentDelete(client);
            }}
            style={{ padding: '10px 14px', background: '#fff', color: '#dc2626', borderColor: '#fca5a5' }}
          >
            <I n="trash" s={15} />
            Permanently delete
          </B>

          <B
            k={1}
            onPress={handleRestore}
            style={{ padding: '10px 18px', opacity: loading ? 0.6 : 1 }}
          >
            <I n="back" s={15} />
            {loading ? 'Restoring...' : 'Restore client'}
          </B>
        </div>
      </div>
    </div>
  );
};

// Modal 3: Hard Permanent Delete Confirmation
export const PermanentDeleteConfirmModal: React.FC<{
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ client, onClose, onSuccess }) => {
  const { toast } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePermanentDelete = async () => {
    setLoading(true);
    try {
      await api.clients.permanentDelete(client.id);
      toast(`${client.name} permanently removed`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to permanently delete client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(15,23,42,.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 24px 70px rgba(15,23,42,.35)',
          padding: 24,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <b style={{ fontSize: 18, color: '#991b1b' }}>Permanently delete client?</b>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
          Are you sure you want to permanently delete <b>{client.name}</b>? This action cannot be undone and will permanently remove all associated tasks, invoices, and documents.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <B onPress={onClose} style={{ padding: '8px 14px' }}>
            Cancel
          </B>
          <B
            onPress={handlePermanentDelete}
            style={{
              padding: '8px 14px',
              background: '#b91c1c',
              color: '#fff',
              border: 'none',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <I n="trash" s={15} />
            {loading ? 'Deleting...' : 'Yes, Delete Permanently'}
          </B>
        </div>
      </div>
    </div>
  );
};
