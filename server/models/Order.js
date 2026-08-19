import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerAddress: { type: String, required: true, trim: true },
    // Line items snapshot the product at purchase time so the order stays
    // intact even if the product changes later. vendorId per line enables
    // per-vendor order views.
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        image: { type: String, default: '' },
        price: { type: Number, required: true },
        qty: { type: Number, required: true, min: 1 },
        // Fulfilment leg: the seller dispatches to the NaijaMart warehouse
        // (or directly to the buyer for single-seller orders), and the admin
        // confirms arrival before shipping the consolidated order.
        fulfillment: {
          type: String,
          enum: ['pending', 'sent', 'received'],
          default: 'pending',
        },
        // True once the buyer's money for this line has been refunded. A
        // refunded line is never paid out to its seller.
        refunded: { type: Boolean, default: false },
      },
    ],
    total: { type: Number, required: true },
    // Where the buyer's money came from and whether the platform holds it in
    // escrow. card/transfer are assumed captured at checkout (the real capture
    // is the payment processor's seam); cod is pending until the courier
    // remits and the admin marks it captured.
    payment: {
      method: { type: String, enum: ['card', 'transfer', 'cod'], default: 'cod' },
      status: { type: String, enum: ['pending', 'captured', 'refunded'], default: 'pending' },
      amount: { type: Number, default: 0 },
      capturedAt: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    // Set when the order is marked delivered; the seller payout window runs
    // from here.
    deliveredAt: { type: Date, default: null },
    // Coupon applied at checkout
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

orderSchema.index({ 'items.vendorId': 1 })

export default mongoose.model('Order', orderSchema)
