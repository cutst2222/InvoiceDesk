import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getCurrentUser,
  listAllUsers,
  listPendingConsultants,
  login,
  logout,
  register,
  reviewConsultant,
  updateMyProfile,
  updateUserByAdmin,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  login
);

router.get('/me', authMiddleware, getCurrentUser);

router.put(
  '/me',
  authMiddleware,
  [
    body('name').optional().isString().trim().notEmpty().withMessage('Name must be a valid string'),
    body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  updateMyProfile
);

router.post('/logout', authMiddleware, logout);

router.get('/users', authMiddleware, requireRole('admin'), listAllUsers);
router.get('/users/pending', authMiddleware, requireRole('admin'), listPendingConsultants);

router.patch(
  '/users/:userId/approval',
  authMiddleware,
  requireRole('admin'),
  [
    param('userId').isMongoId().withMessage('Valid user id is required'),
    body('decision').isIn(['approve', 'reject']).withMessage('Decision must be approve or reject'),
  ],
  validateRequest,
  reviewConsultant
);

router.put(
  '/users/:userId',
  authMiddleware,
  requireRole('admin'),
  [
    param('userId').isMongoId().withMessage('Valid user id is required'),
    body('name').optional().isString().trim().notEmpty().withMessage('Name must be valid'),
    body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
    body('role').optional().isIn(['admin', 'consultant']).withMessage('Role must be valid'),
    body('approvalStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('Approval status must be valid'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  updateUserByAdmin
);

export default router;
