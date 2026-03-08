import bcrypt from 'bcryptjs';
import Consultant from '../models/Consultant.js';
import { generateToken } from '../utils/generateToken.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
};

const userView = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  approvalStatus: user.approvalStatus,
  createdAt: user.createdAt,
  approvedAt: user.approvedAt,
});

export const register = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.toLowerCase().trim();
    const password = req.body.password;

    const existing = await Consultant.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const consultant = await Consultant.create({
      name,
      email,
      password: hashedPassword,
      role: 'consultant',
      approvalStatus: 'pending',
    });

    return res.status(201).json({
      message: 'Registration submitted. Please wait for admin approval.',
      user: userView(consultant),
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await Consultant.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'consultant' && user.approvalStatus !== 'approved') {
      const reason = user.approvalStatus === 'rejected'
        ? 'Your account has been rejected by admin.'
        : 'Your account is pending admin approval.';

      return res.status(403).json({ message: reason });
    }

    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    res.cookie('token', token, cookieOptions);

    return res.json({
      token,
      user: userView(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await Consultant.findById(req.user.id).select(
      'name email role approvalStatus createdAt approvedAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: userView(user) });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token', cookieOptions);
  return res.json({ message: 'Logged out successfully' });
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const user = await Consultant.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, password } = req.body;

    if (name) {
      user.name = String(name).trim();
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = await Consultant.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      user.email = normalizedEmail;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    await user.save();

    return res.json({
      message: 'Profile updated',
      user: userView(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const listAllUsers = async (req, res, next) => {
  try {
    const users = await Consultant.find()
      .select('name email role approvalStatus createdAt approvedAt')
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (error) {
    return next(error);
  }
};

export const listPendingConsultants = async (req, res, next) => {
  try {
    const users = await Consultant.find({ role: 'consultant', approvalStatus: 'pending' })
      .select('name email role approvalStatus createdAt')
      .sort({ createdAt: 1 });

    return res.json({ users });
  } catch (error) {
    return next(error);
  }
};

export const reviewConsultant = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { decision } = req.body;

    const user = await Consultant.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Consultant not found' });
    }

    if (user.role !== 'consultant') {
      return res.status(400).json({ message: 'Only consultants can be approved or rejected' });
    }

    if (decision === 'approve') {
      user.approvalStatus = 'approved';
      user.approvedAt = new Date();
      user.approvedBy = req.user.id;
    }

    if (decision === 'reject') {
      user.approvalStatus = 'rejected';
      user.approvedAt = null;
      user.approvedBy = req.user.id;
    }

    await user.save();

    const decisionLabel = decision === 'approve' ? 'approved' : 'rejected';

    return res.json({
      message: `Consultant ${decisionLabel} successfully`,
      user: userView(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserByAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await Consultant.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, role, approvalStatus, password } = req.body;

    if (name) {
      user.name = String(name).trim();
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = await Consultant.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      user.email = normalizedEmail;
    }

    if (role) {
      user.role = role;
    }

    if (approvalStatus) {
      user.approvalStatus = approvalStatus;
      user.approvedAt = approvalStatus === 'approved' ? new Date() : null;
      user.approvedBy = req.user.id;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    if (user.role === 'admin') {
      user.approvalStatus = 'approved';
      if (!user.approvedAt) {
        user.approvedAt = new Date();
      }
    }

    await user.save();

    return res.json({
      message: 'User updated successfully',
      user: userView(user),
    });
  } catch (error) {
    return next(error);
  }
};
