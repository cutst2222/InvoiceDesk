import bcrypt from 'bcryptjs';
import Consultant from '../models/Consultant.js';

export const ensureAdminUser = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'Maryannsimi@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'InvoiceDesk';
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  const existingAdmin = await Consultant.findOne({ email: adminEmail });

  if (existingAdmin) {
    let shouldSave = false;

    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      shouldSave = true;
    }

    if (existingAdmin.approvalStatus !== 'approved') {
      existingAdmin.approvalStatus = 'approved';
      existingAdmin.approvedAt = new Date();
      shouldSave = true;
    }

    const passwordMatches = await bcrypt.compare(adminPassword, existingAdmin.password);
    if (!passwordMatches) {
      existingAdmin.password = await bcrypt.hash(adminPassword, 12);
      shouldSave = true;
    }

    if (shouldSave) {
      await existingAdmin.save();
    }

    return existingAdmin;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await Consultant.create({
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    approvalStatus: 'approved',
    approvedAt: new Date(),
  });

  return admin;
};
