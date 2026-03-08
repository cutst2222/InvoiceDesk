import nodemailer from 'nodemailer';

let transporter;

const shouldUseJsonTransport = () => {
  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  const hasSmtpConfig =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    return true;
  }

  if (host.endsWith('example.com') || host === 'localhost') {
    return true;
  }

  if (process.env.SMTP_DISABLED === 'true') {
    return true;
  }

  return false;
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (shouldUseJsonTransport()) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendSafe = async (mailOptions) => {
  try {
    const mailer = getTransporter();
    await mailer.sendMail(mailOptions);
    return { sent: true };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { sent: false, error: error.message };
  }
};

export const sendConsultantConfirmationEmail = async ({ consultantEmail }) => {
  return sendSafe({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: consultantEmail,
    subject: 'Invoice Submission Confirmation',
    text: 'Your invoice has been successfully submitted.',
  });
};

export const sendAdminInvoiceEmail = async ({ filePath, fileName, consultantName }) => {
  return sendSafe({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: process.env.ADMIN_EMAIL || 'Maryannsimi@gmail.com',
    subject: `New Invoice Submitted - ${consultantName}`,
    text: `${consultantName} submitted a new invoice. The PDF is attached.`,
    attachments: [
      {
        filename: fileName,
        path: filePath,
      },
    ],
  });
};
