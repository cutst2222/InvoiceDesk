import fs from 'fs/promises';
import Invoice from '../models/Invoice.js';
import Consultant from '../models/Consultant.js';
import { sendAdminInvoiceEmail, sendConsultantConfirmationEmail } from '../services/emailService.js';
import { deleteInvoiceDocument, readInvoiceDocument, saveInvoiceDocument } from '../services/fileStorageService.js';
import { generateInvoicePdf } from '../services/pdfService.js';
import { sanitizeInvoiceInput } from '../utils/sanitize.js';

const isAdmin = (user) => user.role === 'admin';

const invoiceAccessQuery = (user, invoiceId) => {
  if (isAdmin(user)) {
    return { _id: invoiceId };
  }

  return { _id: invoiceId, consultantId: user.id };
};

const normalizeAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const mapInvoiceFields = (payload, existingInvoice = {}) => ({
  invoiceNumber: payload.invoiceNumber ?? existingInvoice.invoiceNumber,
  invoiceMonth: payload.invoiceMonth ?? existingInvoice.invoiceMonth,
  invoiceYear: payload.invoiceYear ?? existingInvoice.invoiceYear,
  consultingPeriodFrom: payload.consultingPeriodFrom ?? existingInvoice.consultingPeriodFrom,
  consultingPeriodTo: payload.consultingPeriodTo ?? existingInvoice.consultingPeriodTo,
  invoiceAmount:
    payload.invoiceAmount !== undefined && payload.invoiceAmount !== null
      ? normalizeAmount(payload.invoiceAmount)
      : existingInvoice.invoiceAmount,
  serviceProvided: payload.serviceProvided ?? existingInvoice.serviceProvided,
  serviceProvidedDetails:
    payload.serviceProvidedDetails ?? existingInvoice.serviceProvidedDetails ?? '',
});

export const submitInvoice = async (req, res, next) => {
  try {
    const user = await Consultant.findById(req.user.id).select('name email role approvalStatus');
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (user.role === 'consultant' && user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: 'Your account is not approved for invoice submission' });
    }

    const payload = sanitizeInvoiceInput(req.body);

    const invoiceDocument = await saveInvoiceDocument({
      consultantId: user._id,
      fileName: payload.invoiceDocumentName,
      dataUrl: payload.invoiceDocumentData,
    });

    const mappedFields = mapInvoiceFields(payload);

    if (mappedFields.serviceProvided === 'Other' && !String(mappedFields.serviceProvidedDetails || '').trim()) {
      await deleteInvoiceDocument(invoiceDocument.relativePath);
      return res.status(400).json({ message: 'Please describe the service when selecting Other' });
    }

    const invoice = await Invoice.create({
      consultantId: user._id,
      ...mappedFields,
      invoiceDocument,
      approvalStatus: 'pending',
    });

    // Generate a one-off PDF for email delivery, then remove it from disk.
    const { filePath, fileName } = await generateInvoicePdf({
      consultantName: user.name,
      invoice,
    });

    const warnings = [];

    try {
      const consultantMail = await sendConsultantConfirmationEmail({ consultantEmail: user.email });
      if (!consultantMail.sent) {
        warnings.push('Consultant confirmation email could not be sent.');
      }

      const adminMail = await sendAdminInvoiceEmail({
        filePath,
        fileName,
        consultantName: user.name,
      });
      if (!adminMail.sent) {
        warnings.push('Admin invoice email could not be sent.');
      }
    } finally {
      await fs.unlink(filePath).catch(() => {});
    }

    return res.status(201).json({
      message: warnings.length
        ? `Invoice submitted successfully. ${warnings.join(' ')}`
        : 'Invoice submitted successfully',
      warnings,
      invoice,
    });
  } catch (error) {
    return next(error);
  }
};

export const listInvoices = async (req, res, next) => {
  try {
    const archivedOnly = req.query.archived === 'true';
    const query = {
      ...(isAdmin(req.user) ? {} : { consultantId: req.user.id }),
      archivedAt: archivedOnly ? { $ne: null } : null,
    };
    const invoices = await Invoice.find(query)
      .populate('consultantId', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ invoices });
  } catch (error) {
    return next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne(invoiceAccessQuery(req.user, req.params.invoiceId)).populate(
      'consultantId',
      'name email'
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.json({ invoice });
  } catch (error) {
    return next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne(invoiceAccessQuery(req.user, req.params.invoiceId));

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payload = sanitizeInvoiceInput(req.body);

    if (payload.invoiceDocumentData) {
      const previousRelativePath = invoice.invoiceDocument?.relativePath;
      const savedDocument = await saveInvoiceDocument({
        consultantId: invoice.consultantId,
        fileName: payload.invoiceDocumentName,
        dataUrl: payload.invoiceDocumentData,
      });
      invoice.invoiceDocument = savedDocument;
      invoice.fileDeletedAt = null;
      await deleteInvoiceDocument(previousRelativePath);
    }

    Object.assign(invoice, mapInvoiceFields(payload, invoice));

    if (!Number.isFinite(Number(invoice.invoiceAmount)) || Number(invoice.invoiceAmount) <= 0) {
      return res.status(400).json({ message: 'Invoice amount must be greater than 0' });
    }

    if (new Date(invoice.consultingPeriodTo) < new Date(invoice.consultingPeriodFrom)) {
      return res.status(400).json({ message: 'Consulting period must be valid' });
    }

    if (!invoice.invoiceDocument?.relativePath) {
      return res.status(400).json({ message: 'Invoice file is required (photo or PDF)' });
    }

    if (invoice.serviceProvided === 'Other' && !String(invoice.serviceProvidedDetails || '').trim()) {
      return res.status(400).json({ message: 'Please describe the service when selecting Other' });
    }

    if (!isAdmin(req.user)) {
      invoice.approvalStatus = 'pending';
      invoice.approvedAt = null;
      invoice.approvedBy = null;
      invoice.rejectedAt = null;
      invoice.approvalNote = '';
    }

    await invoice.save();

    return res.json({
      message: 'Invoice updated successfully',
      invoice,
    });
  } catch (error) {
    return next(error);
  }
};

export const reviewInvoice = async (req, res, next) => {
  try {
    const { decision, note } = req.body;
    const invoice = await Invoice.findById(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'Only pending invoices can be reviewed' });
    }

    invoice.approvalNote = String(note || '').trim();

    if (decision === 'approve') {
      invoice.approvalStatus = 'approved';
      invoice.approvedAt = new Date();
      invoice.approvedBy = req.user.id;
      invoice.rejectedAt = null;
    }

    if (decision === 'reject') {
      invoice.approvalStatus = 'rejected';
      invoice.rejectedAt = new Date();
      invoice.approvedAt = null;
      invoice.approvedBy = req.user.id;

      await deleteInvoiceDocument(invoice.invoiceDocument?.relativePath);
      invoice.invoiceDocument = undefined;
      invoice.fileDeletedAt = new Date();
    }

    await invoice.save();

    const decisionLabel = decision === 'approve' ? 'approved' : 'rejected';

    return res.json({
      message: `Invoice ${decisionLabel} successfully`,
      invoice,
    });
  } catch (error) {
    return next(error);
  }
};

export const downloadApprovedInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.approvalStatus !== 'approved') {
      return res.status(400).json({ message: 'Invoice must be approved before download' });
    }

    const relativePath = invoice.invoiceDocument?.relativePath;
    if (!relativePath || invoice.fileDeletedAt) {
      return res.status(410).json({ message: 'Invoice file is no longer available' });
    }

    const { absolutePath, exists } = await readInvoiceDocument(relativePath);
    if (!exists) {
      invoice.fileDeletedAt = new Date();
      invoice.invoiceDocument = undefined;
      await invoice.save();

      return res.status(410).json({ message: 'Invoice file is no longer available' });
    }

    res.setHeader('Content-Type', invoice.invoiceDocument.mimeType);

    return res.download(absolutePath, invoice.invoiceDocument.originalName, async (error) => {
      if (error) {
        return next(error);
      }

      await deleteInvoiceDocument(relativePath);
      await Invoice.updateOne(
        { _id: invoice._id },
        {
          $set: {
            invoiceDocument: undefined,
            fileDeletedAt: new Date(),
          },
        }
      );
    });
  } catch (error) {
    return next(error);
  }
};

export const viewInvoiceFile = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const relativePath = invoice.invoiceDocument?.relativePath;
    if (!relativePath || invoice.fileDeletedAt) {
      return res.status(410).json({ message: 'Invoice file is no longer available' });
    }

    const { absolutePath, exists } = await readInvoiceDocument(relativePath);
    if (!exists) {
      invoice.fileDeletedAt = new Date();
      invoice.invoiceDocument = undefined;
      await invoice.save();

      return res.status(410).json({ message: 'Invoice file is no longer available' });
    }

    res.setHeader('Content-Type', invoice.invoiceDocument.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceDocument.originalName}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    return next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne(invoiceAccessQuery(req.user, req.params.invoiceId));

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await deleteInvoiceDocument(invoice.invoiceDocument?.relativePath);
    await Invoice.deleteOne({ _id: invoice._id });

    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

export const archiveInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne(invoiceAccessQuery(req.user, req.params.invoiceId));

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.archivedAt) {
      return res.status(400).json({ message: 'Invoice is already archived' });
    }

    invoice.archivedAt = new Date();
    await invoice.save();

    return res.json({ message: 'Invoice archived successfully' });
  } catch (error) {
    return next(error);
  }
};
