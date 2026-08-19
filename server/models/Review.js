import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
    images: { type: [String], default: [] },
    isVerifiedPurchase: { type: Boolean, default: true },
    helpful: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// One review per customer per product per order
reviewSchema.index({ orderId: 1, productId: 1, customerId: 1 }, { unique: true })
reviewSchema.index({ productId: 1, createdAt: -1 })
reviewSchema.index({ vendorId: 1, createdAt: -1 })

export default mongoose.model('Review', reviewSchema)
