import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0, default: null },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    inStock: { type: Boolean, default: true },
    badge: { type: String, default: null },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    // every product belongs to a vendor user
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Product', productSchema)
