import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  deleteInvoice,
  downloadApprovedInvoice,
  getInvoiceById,
  listInvoices,
  reviewInvoice,
  submitInvoice,
  updateInvoice,
  viewInvoiceFile,
} from '../controllers/invoiceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { MONTH_OPTIONS, SERVICE_OPTIONS } from '../utils/constants.js';

const invoiceValidation = [
  body('invoiceNumber').trim().notEmpty().withMessage('Invoice number required'),
  body('invoiceMonth').isIn(MONTH_OPTIONS).withMessage('Invoice month is invalid'),
  body('invoiceYear').isInt({ min: 2000, max: 9999 }).withMessage('Invoice year is invalid'),
  body('consultingPeriodFrom').isISO8601().withMessage('Consulting period start date is required'),
  body('consultingPeriodTo')
    .isISO8601()
    .withMessage('Consulting period end date is required')
    .custom((value, { req }) => {
      const fromDate = new Date(req.body.consultingPeriodFrom);
      const toDate = new Date(value);

      if (toDate < fromDate) {
        throw new Error('Consulting period must be valid');
      }

      return true;
    }),
  body('invoiceAmount').isFloat({ gt: 0 }).withMessage('Invoice amount must be greater than 0'),
  body('serviceProvided').isIn(SERVICE_OPTIONS).withMessage('Service provided is invalid'),
  body('serviceProvidedDetails').custom((value, { req }) => {
    if (req.body.serviceProvided === 'Other' && !String(value || '').trim()) {
      throw new Error('Please describe the service when selecting Other');
    }

    return true;
  }),
];

const invoiceUpdateValidation = [
  body('invoiceNumber').optional().trim().notEmpty().withMessage('Invoice number required'),
  body('invoiceMonth').optional().isIn(MONTH_OPTIONS).withMessage('Invoice month is invalid'),
  body('invoiceYear').optional().isInt({ min: 2000, max: 9999 }).withMessage('Invoice year is invalid'),
  body('consultingPeriodFrom')
    .optional()
    .isISO8601()
    .withMessage('Consulting period start date is required'),
  body('consultingPeriodTo')
    .optional()
    .isISO8601()
    .withMessage('Consulting period end date is required')
    .custom((value, { req }) => {
      if (!value || !req.body.consultingPeriodFrom) {
        return true;
      }

      const fromDate = new Date(req.body.consultingPeriodFrom);
      const toDate = new Date(value);

      if (toDate < fromDate) {
        throw new Error('Consulting period must be valid');
      }

      return true;
    }),
  body('invoiceAmount').optional().isFloat({ gt: 0 }).withMessage('Invoice amount must be greater than 0'),
  body('serviceProvided').optional().isIn(SERVICE_OPTIONS).withMessage('Service provided is invalid'),
  body('serviceProvidedDetails')
    .optional()
    .isString()
    .trim()
    .custom((value, { req }) => {
      if (req.body.serviceProvided === 'Other' && !String(value || '').trim()) {
        throw new Error('Please describe the service when selecting Other');
      }

      return true;
    }),
  body('invoiceDocumentData')
    .optional()
    .isString()
    .notEmpty()
    .matches(/^data:(application\/pdf|image\/(png|jpeg|jpg));base64,/)
    .withMessage('Invoice file must be a PDF or image'),
  body('invoiceDocumentName').optional().isString().trim().notEmpty(),
];

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  [
    ...invoiceValidation,
    body('invoiceDocumentData')
      .isString()
      .notEmpty()
      .matches(/^data:(application\/pdf|image\/(png|jpeg|jpg));base64,/)
      .withMessage('Invoice file must be a PDF or image'),
    body('invoiceDocumentName').isString().trim().notEmpty().withMessage('Invoice file name required'),
  ],
  validateRequest,
  submitInvoice
);

router.get('/', listInvoices);

router.get(
  '/:invoiceId',
  [param('invoiceId').isMongoId().withMessage('Valid invoice id is required')],
  validateRequest,
  getInvoiceById
);

router.put(
  '/:invoiceId',
  [param('invoiceId').isMongoId().withMessage('Valid invoice id is required'), ...invoiceUpdateValidation],
  validateRequest,
  updateInvoice
);

router.patch(
  '/:invoiceId/approval',
  requireRole('admin'),
  [
    param('invoiceId').isMongoId().withMessage('Valid invoice id is required'),
    body('decision').isIn(['approve', 'reject']).withMessage('Decision must be approve or reject'),
    body('note').optional().isString(),
  ],
  validateRequest,
  reviewInvoice
);

router.get(
  '/:invoiceId/download',
  requireRole('admin'),
  [param('invoiceId').isMongoId().withMessage('Valid invoice id is required')],
  validateRequest,
  downloadApprovedInvoice
);

router.get(
  '/:invoiceId/view',
  requireRole('admin'),
  [param('invoiceId').isMongoId().withMessage('Valid invoice id is required')],
  validateRequest,
  viewInvoiceFile
);

router.delete(
  '/:invoiceId',
  [param('invoiceId').isMongoId().withMessage('Valid invoice id is required')],
  validateRequest,
  deleteInvoice
);

export default router;
