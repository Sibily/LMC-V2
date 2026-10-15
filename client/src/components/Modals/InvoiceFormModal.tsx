import React, { useState } from 'react';
import { V, F, B, Modal, inp, TODAY, add, aed } from '../Common';
import { I } from '../Icons';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ClientInvoice, Service } from '../../types';

interface InvoiceFormModalProps {
  clientId: string;
  invoice?: ClientInvoice | null;
  services?: Service[];
  existingInvoiceCount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  clientId,
  invoice,
  services = [],
  existingInvoiceCount = 0,
  onClose,
  onSuccess,
}) => {
  const { toast } = useAuth();
  const defaultNo = invoice ? invoice.invoiceNo : 'INV-' + String(existingInvoiceCount + 1).padStart(4, '0');

  const [form, setForm] = useState({
    invoiceNo: defaultNo,
    serviceId: invoice?.serviceId || '',
    description: invoice?.description || '',
    amount: String(invoice?.amount || ''),
    vatApplicable: invoice?.vatApplicable !== undefined ? invoice.vatApplicable : true,
    issuedDate: invoice?.issuedDate || TODAY,
    dueDate: invoice?.dueDate || add(7),
    status: invoice?.status || 'Draft',
    note: invoice?.note || '',
  });

  const [loading, setLoading] = useState(false);

  const baseAmt = parseFloat(form.amount) || 0;
  const vatAmt = form.vatApplicable ? Math.round(baseAmt * 5) / 100 : 0;
  const totalAmt = Math.round((baseAmt + vatAmt) * 100) / 100;

  const handleSave = async () => {
    if (!form.invoiceNo.trim()) {
      toast('Please enter an invoice number');
      return;
    }
    if (!(baseAmt > 0)) {
      toast('Please enter a valid invoice amount');
      return;
    }

    setLoading(true);
    try {
      if (invoice?.id) {
        await api.clients.updateInvoice(clientId, invoice.id, {
          invoiceNo: form.invoiceNo.trim(),
          serviceId: form.serviceId || null,
          description: form.description.trim(),
          amount: baseAmt,
          vatApplicable: form.vatApplicable,
          issuedDate: form.issuedDate,
          dueDate: form.dueDate,
          status: form.status,
          note: form.note.trim(),
        });
        toast('Invoice updated');
      } else {
        await api.clients.createInvoice(clientId, {
          invoiceNo: form.invoiceNo.trim(),
          serviceId: form.serviceId || null,
          description: form.description.trim(),
          amount: baseAmt,
          vatApplicable: form.vatApplicable,
          issuedDate: form.issuedDate,
          dueDate: form.dueDate,
          status: form.status,
          note: form.note.trim(),
        });
        toast('Invoice created');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={invoice ? `Invoice · ${invoice.invoiceNo}` : 'Create Invoice'} close={onClose}>
      <V style={{ gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <F l="Invoice Number *">
            <input
              style={inp}
              placeholder="e.g. INV-0001"
              value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
            />
          </F>
          <F l="Status">
            <select
              style={inp}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </F>
        </div>

        <F l="Service (optional)">
          <select
            style={inp}
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
          >
            <option value="">General client invoice (none)</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </F>

        <F l="Description">
          <input
            style={inp}
            placeholder="e.g. Legal Retainer Fee - Q1, Contract drafting"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </F>

        <F l="Amount (AED) *">
          <input
            type="number"
            step="0.01"
            style={inp}
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </F>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.vatApplicable}
            onChange={(e) => setForm({ ...form, vatApplicable: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: '#16a34a' }}
          />
          Apply 5% UAE VAT (+{aed(vatAmt)})
        </label>

        {/* Calculation summary box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#475569' }}>Total Payable:</span>
          <b style={{ fontSize: 18, color: '#0f172a' }}>{aed(totalAmt)}</b>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <F l="Issue Date">
            <input
              type="date"
              style={inp}
              value={form.issuedDate}
              onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
            />
          </F>
          <F l="Due Date">
            <input
              type="date"
              style={inp}
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </F>
        </div>

        <F l="Notes / Terms (optional)">
          <textarea
            style={{ ...inp, minHeight: 60, resize: 'vertical' }}
            placeholder="Payment instructions, bank account IBAN, or terms..."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </F>

        <B k={1} onPress={handleSave} style={{ marginTop: 6, opacity: loading ? 0.6 : 1 }}>
          <I n={invoice ? 'edit' : 'receipt'} s={16} />
          {loading ? 'Saving...' : invoice ? 'Save Changes' : 'Create Invoice'}
        </B>
      </V>
    </Modal>
  );
};
