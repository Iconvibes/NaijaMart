import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = platform-wide
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Platform-wide coupons have null vendorId; vendor coupons are scoped
couponSchema.index({ code: 1 }, { unique: true })
couponSchema.index({ vendorId: 1, active: 1 })

export default mongoose.model('Coupon', couponSchema)
