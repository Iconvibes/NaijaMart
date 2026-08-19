import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'vendor', 'customer'], default: 'customer' },
    // vendors only - approval status; admin accounts are auto-approved
    vendorStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // customers get approved by default; vendors start pending
    },
    // vendors only - real logo image under /images/vendors/
    logo: { type: String, default: null },
    // vendors only - banner image for storefront
    banner: { type: String, default: null },
    // vendors only - short bio for storefront
    bio: { type: String, default: '' },
    // vendors only - WhatsApp number for order notifications
    whatsapp: { type: String, default: null },
    // vendors only - SEO-friendly slug derived from name
    slug: { type: String, default: null, lowercase: true, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)
