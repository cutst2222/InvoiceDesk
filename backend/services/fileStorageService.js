import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const uploadsRoot = path.resolve(process.cwd(), 'uploaded-invoices');
const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);

const extensionByMime = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
};

const parseDataUrl = (dataUrl) => {
  const matches = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!matches) {
    throw new Error('Invoice file must be a valid base64 data URL');
  }

  const mimeType = matches[1].toLowerCase();
  const base64Data = matches[2];

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error('Invoice file must be PDF or image');
  }

  return { mimeType, base64Data };
};

export const saveInvoiceDocument = async ({ consultantId, fileName, dataUrl }) => {
  const { mimeType, base64Data } = parseDataUrl(dataUrl);

  const extension = extensionByMime[mimeType] || 'bin';
  const safeFileName = (fileName || `invoice.${extension}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedName = `${Date.now()}_${crypto.randomUUID()}_${safeFileName}`;
  const consultantDir = path.join(uploadsRoot, String(consultantId));

  await fs.mkdir(consultantDir, { recursive: true });

  const absolutePath = path.join(consultantDir, storedName);
  const buffer = Buffer.from(base64Data, 'base64');

  await fs.writeFile(absolutePath, buffer);

  return {
    originalName: safeFileName,
    storedName,
    mimeType,
    relativePath: path.relative(process.cwd(), absolutePath),
    sizeBytes: buffer.byteLength,
  };
};

export const deleteInvoiceDocument = async (relativePath) => {
  if (!relativePath) {
    return;
  }

  const absolutePath = path.resolve(process.cwd(), relativePath);
  await fs.unlink(absolutePath).catch(() => {});
};

export const readInvoiceDocument = async (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const exists = await fs
    .access(absolutePath)
    .then(() => true)
    .catch(() => false);

  return { absolutePath, exists };
};
