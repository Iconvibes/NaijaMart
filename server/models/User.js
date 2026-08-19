import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'vendor', 'customer'], default: 'customer' },
    // vendors only - real logo image under /images/vendors/
    logo: { type: String, default: null },
    // vendors only - WhatsApp number for order notifications
    whatsapp: { type: String, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)
