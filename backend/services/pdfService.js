import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const toIsoDate = (value) => new Date(value).toISOString().split('T')[0];

const formatAmount = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);

const toMonthToken = (month) => month.toUpperCase();

const normalizeName = (name) => name.replace(/[^a-zA-Z0-9]/g, '');

export const buildInvoiceFileName = ({ consultantName, invoiceMonth, invoiceYear }) => {
  return `${normalizeName(consultantName)}_INVOICE_${toMonthToken(invoiceMonth)}${invoiceYear}.pdf`;
};

const invoiceHtml = ({ consultantName, invoice }) => {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1 { color: #1d4ed8; font-size: 26px; margin-bottom: 24px; }
          .row { margin-bottom: 10px; }
          .label { font-weight: 700; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; background: #ffffff; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06); }
        </style>
      </head>
      <body>
        <h1>Consultant Invoice</h1>
        <div class="card">
          <div class="row"><span class="label">Consultant Name:</span> ${consultantName}</div>
          <div class="row"><span class="label">Invoice Number:</span> ${invoice.invoiceNumber}</div>
          <div class="row"><span class="label">Invoice Month:</span> ${invoice.invoiceMonth} ${invoice.invoiceYear}</div>
          <div class="row"><span class="label">Consulting Period:</span> ${toIsoDate(invoice.consultingPeriodFrom)} to ${toIsoDate(invoice.consultingPeriodTo)}</div>
          <div class="row"><span class="label">Invoice Amount:</span> ${formatAmount(invoice.invoiceAmount)}</div>
          <div class="row"><span class="label">Service Provided:</span> ${invoice.serviceProvided}</div>
          ${
            invoice.serviceProvided === 'Other' && invoice.serviceProvidedDetails
              ? `<div class="row"><span class="label">Service Details:</span> ${invoice.serviceProvidedDetails}</div>`
              : ''
          }
        </div>
      </body>
    </html>
  `;
};

export const generateInvoicePdf = async ({ consultantName, invoice }) => {
  const outputDir = path.resolve(process.cwd(), 'generated-pdfs');
  await fs.mkdir(outputDir, { recursive: true });

  const fileName = buildInvoiceFileName({
    consultantName,
    invoiceMonth: invoice.invoiceMonth,
    invoiceYear: invoice.invoiceYear,
  });

  const filePath = path.join(outputDir, fileName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(invoiceHtml({ consultantName, invoice }), {
      waitUntil: 'networkidle0',
    });
    await page.pdf({ path: filePath, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }

  return { filePath, fileName };
};
