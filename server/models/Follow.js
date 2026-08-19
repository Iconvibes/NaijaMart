import mongoose from 'mongoose'

const followSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// One follow per customer per vendor
followSchema.index({ customerId: 1, vendorId: 1 }, { unique: true })
followSchema.index({ vendorId: 1 })

export default mongoose.model('Follow', followSchema)
