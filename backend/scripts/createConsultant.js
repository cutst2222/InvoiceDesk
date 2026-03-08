import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Consultant from '../models/Consultant.js';

dotenv.config();

const run = async () => {
  const {
    MONGO_URI,
    SEED_CONSULTANT_NAME,
    SEED_CONSULTANT_EMAIL,
    SEED_CONSULTANT_PASSWORD,
  } = process.env;

  if (!MONGO_URI || !SEED_CONSULTANT_NAME || !SEED_CONSULTANT_EMAIL || !SEED_CONSULTANT_PASSWORD) {
    throw new Error('Missing required env vars for consultant seeding');
  }

  await mongoose.connect(MONGO_URI);

  const existing = await Consultant.findOne({ email: SEED_CONSULTANT_EMAIL.toLowerCase() });
  if (existing) {
    console.log('Consultant already exists.');
    await mongoose.disconnect();
    return;
  }

  const password = await bcrypt.hash(SEED_CONSULTANT_PASSWORD, 12);
  await Consultant.create({
    name: SEED_CONSULTANT_NAME,
    email: SEED_CONSULTANT_EMAIL.toLowerCase(),
    password,
    role: 'consultant',
    approvalStatus: 'approved',
    approvedAt: new Date(),
  });

  console.log('Seed consultant created successfully.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
