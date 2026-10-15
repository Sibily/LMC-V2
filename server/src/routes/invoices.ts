import { Router } from 'express';
import { db } from '../db/index.js';
import { clientInvoices } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { broadcastDataChange } from '../services/socket.js';

const router = Router();

// List invoices for a client
router.get('/:clientId/invoices', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const invoices = await db.query.clientInvoices.findMany({
      where: eq(clientInvoices.clientId, clientId),
      with: {
        service: true,
      },
      orderBy: [desc(clientInvoices.createdAt)],
    });
    return res.json(invoices);
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Create invoice for a client
router.post('/:clientId/invoices', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;
    const { invoiceNo, serviceId, description, amount, vatApplicable, issuedDate, dueDate, status, note } = req.body;

    const baseAmount = parseFloat(amount) || 0;
    const isVat = vatApplicable !== false;
    const vatAmt = isVat ? Math.round(baseAmount * 5) / 100 : 0;
    const totalAmt = Math.round((baseAmount + vatAmt) * 100) / 100;

    // Auto-generate invoice number if not provided
    let no = invoiceNo;
    if (!no || !no.trim()) {
      const allInvoices = await db.select({ id: clientInvoices.id }).from(clientInvoices);
      no = 'INV-' + String(allInvoices.length + 1).padStart(4, '0');
    }

    const [newInvoice] = await db.insert(clientInvoices).values({
      clientId,
      invoiceNo: no.trim(),
      serviceId: serviceId || null,
      description: description || '',
      amount: String(baseAmount),
      vatApplicable: isVat,
      vatAmount: String(vatAmt),
      totalAmount: String(totalAmt),
      issuedDate: issuedDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: status || 'Draft',
      note: note || '',
    }).returning();

    broadcastDataChange('clients', 'invoice_created', { clientId, invoice: newInvoice });
    return res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:clientId/invoices/:invId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId, invId } = req.params;
    const { invoiceNo, serviceId, description, amount, vatApplicable, issuedDate, dueDate, status, note } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo.trim();
    if (serviceId !== undefined) updateData.serviceId = serviceId || null;
    if (description !== undefined) updateData.description = description;
    if (issuedDate !== undefined) updateData.issuedDate = issuedDate;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (status !== undefined) updateData.status = status;
    if (note !== undefined) updateData.note = note;

    if (amount !== undefined || vatApplicable !== undefined) {
      const baseAmount = amount !== undefined ? (parseFloat(amount) || 0) : 0;
      const isVat = vatApplicable !== false;
      const vatAmt = isVat ? Math.round(baseAmount * 5) / 100 : 0;
      const totalAmt = Math.round((baseAmount + vatAmt) * 100) / 100;
      updateData.amount = String(baseAmount);
      updateData.vatApplicable = isVat;
      updateData.vatAmount = String(vatAmt);
      updateData.totalAmount = String(totalAmt);
    }

    const [updated] = await db.update(clientInvoices)
      .set(updateData)
      .where(eq(clientInvoices.id, invId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    broadcastDataChange('clients', 'invoice_updated', { clientId, invoice: updated });
    return res.json(updated);
  } catch (error) {
    console.error('Update invoice error:', error);
    return res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:clientId/invoices/:invId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clientId, invId } = req.params;
    await db.delete(clientInvoices).where(eq(clientInvoices.id, invId));
    broadcastDataChange('clients', 'invoice_deleted', { clientId, invId });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

export default router;
