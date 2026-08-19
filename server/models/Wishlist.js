import mongoose from 'mongoose'

const wishlistSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
)

// One wishlist entry per customer per product
wishlistSchema.index({ customerId: 1, productId: 1 }, { unique: true })
wishlistSchema.index({ customerId: 1, createdAt: -1 })

export default mongoose.model('Wishlist', wishlistSchema)
