import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'new_order',
        'order_status',
        'payout_approved',
        'payout_rejected',
        'vendor_approved',
        'vendor_rejected',
        'new_review',
        'withdrawal_approved',
        'withdrawal_rejected',
        'product_approved',
        'product_rejected',
        'coupon_used',
      ],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String, default: null },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
