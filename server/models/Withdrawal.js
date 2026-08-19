import mongoose from 'mongoose'

const withdrawalSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1000 }, // minimum ₦1,000
    status: {
      type: String,
      enum: ['requested', 'approved', 'paid', 'rejected'],
      default: 'requested',
    },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    processedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
)

withdrawalSchema.index({ vendorId: 1, status: 1 })
withdrawalSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model('Withdrawal', withdrawalSchema)
