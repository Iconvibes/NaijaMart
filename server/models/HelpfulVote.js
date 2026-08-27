import mongoose from 'mongoose'

const helpfulVoteSchema = new mongoose.Schema(
  {
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// One vote per user per review
helpfulVoteSchema.index({ reviewId: 1, userId: 1 }, { unique: true })

export default mongoose.model('HelpfulVote', helpfulVoteSchema)
