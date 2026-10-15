import React, { useState } from 'react';
import { V, F, B, Modal, inp, MU } from '../Common';
import { I } from '../Icons';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ClientDocument, Service } from '../../types';

interface DocFormModalProps {
  clientId: string;
  doc?: ClientDocument | null;
  services?: Service[];
  onClose: () => void;
  onSuccess: () => void;
}

const DOC_TYPES = [
  'Passport',
  'Emirates ID',
  'Visa',
  'Trade licence',
  'Contract',
  'Invoice / receipt',
  'Photo',
  'Other',
];

export const DocFormModal: React.FC<DocFormModalProps> = ({
  clientId,
  doc,
  services = [],
  onClose,
  onSuccess,
}) => {
  const { toast } = useAuth();
  const knownType = doc && DOC_TYPES.includes(doc.type);

  const [form, setForm] = useState({
    name: doc?.name || '',
    type: knownType ? doc!.type : (doc ? 'Other' : 'Passport'),
    customType: knownType ? '' : (doc?.customType || doc?.type || ''),
    serviceId: doc?.serviceId || '',
    note: doc?.note || '',
    fileName: doc?.fileName || '',
    fileSize: doc?.fileSize || 0,
    fileUrl: doc?.fileUrl || '',
  });

  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    if (file.size > 800 * 1024) {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: '',
        name: prev.name || baseName,
      }));
      toast('Large file: filename and size recorded');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: reader.result as string,
        name: prev.name || baseName,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Please enter a document name');
      return;
    }

    const finalType = form.type === 'Other' && form.customType.trim() ? form.customType.trim() : form.type;

    setLoading(true);
    try {
      if (doc?.id) {
        await api.clients.updateDoc(clientId, doc.id, {
          name: form.name.trim(),
          type: finalType,
          customType: form.type === 'Other' ? form.customType.trim() : '',
          serviceId: form.serviceId || null,
          note: form.note.trim(),
          fileName: form.fileName,
          fileSize: form.fileSize,
          fileUrl: form.fileUrl,
        });
        toast('Document updated');
      } else {
        await api.clients.addDoc(clientId, {
          name: form.name.trim(),
          type: finalType,
          customType: form.type === 'Other' ? form.customType.trim() : '',
          serviceId: form.serviceId || null,
          note: form.note.trim(),
          fileName: form.fileName,
          fileSize: form.fileSize,
          fileUrl: form.fileUrl,
        });
        toast('Document added');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to save document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={doc ? 'Edit Document' : 'Upload Document'} close={onClose}>
      <V style={{ gap: 12 }}>
        <F l="Document title *">
          <input
            style={inp}
            placeholder="e.g. Trade Licence 2026, Noor Passport"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </F>

        <F l="Category">
          <select
            style={inp}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </F>

        {form.type === 'Other' && (
          <F l="Custom document type">
            <input
              style={inp}
              placeholder="e.g. Tenancy contract, Power of Attorney"
              value={form.customType}
              onChange={(e) => setForm({ ...form, customType: e.target.value })}
            />
          </F>
        )}

        <F l="Linked service (optional)">
          <select
            style={inp}
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
          >
            <option value="">General client document (none)</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </F>

        <F l="Attach file">
          <div
            style={{
              border: '1.5px dashed #cbd5e1',
              borderRadius: 12,
              padding: '14px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <input
              type="file"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ color: '#0284c7' }}>
                <I n="upload" s={22} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                {form.fileName ? form.fileName : 'Choose a file from device'}
              </span>
              <span style={{ fontSize: 11, color: MU }}>
                PDF, images, Word docs up to 25 MB
              </span>
            </div>
          </div>
        </F>

        <F l="Notes (optional)">
          <textarea
            style={{ ...inp, minHeight: 70, resize: 'vertical' }}
            placeholder="Add relevant notes, expiry dates, or reference numbers..."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </F>

        <B k={1} onPress={handleSave} style={{ marginTop: 6, opacity: loading ? 0.6 : 1 }}>
          <I n={doc ? 'edit' : 'upload'} s={16} />
          {loading ? 'Saving...' : doc ? 'Save Changes' : 'Upload Document'}
        </B>
      </V>
    </Modal>
  );
};
