import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    consultantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultant',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceMonth: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceYear: {
      type: Number,
      required: true,
    },
    consultingPeriodFrom: {
      type: Date,
      required: true,
    },
    consultingPeriodTo: {
      type: Date,
      required: true,
    },
    invoiceAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    serviceProvided: {
      type: String,
      required: true,
      trim: true,
    },
    serviceProvidedDetails: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceDocument: {
      originalName: {
        type: String,
        required: true,
      },
      storedName: {
        type: String,
        required: true,
      },
      mimeType: {
        type: String,
        required: true,
      },
      relativePath: {
        type: String,
        required: true,
      },
      sizeBytes: {
        type: Number,
        required: true,
      },
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    approvalNote: {
      type: String,
      default: '',
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultant',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    fileDeletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model('Invoice', invoiceSchema);
