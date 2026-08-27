import mongoose from 'mongoose'

let mode = 'memory'

// The API runs fully in memory when MongoDB is not reachable, so the demo
// works anywhere. Set MONGODB_URI to a real database for persistence.
export const isMemoryDb = () => mode === 'memory'

export async function connectDb() {
  // Accept both MONGODB_URI (correct) and legacy MONGO_URI (from old .env files)
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/naijamart'
  if (process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.warn('⚠  MONGO_URI is deprecated — rename it to MONGODB_URI in your .env file.')
  }

  const isProduction = process.env.NODE_ENV === 'production'

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    mode = 'mongo'
    console.log(`MongoDB connected: ${uri.replace(/\/[^/]+@/, '/***@')}`) // Don't log credentials
  } catch (err) {
    if (isProduction) {
      console.error('\n\x1b[31m⚠  FATAL: MongoDB is unavailable in production.\x1b[0m')
      console.error(`   Connection error: ${err.message}`)
      console.error('   Set MONGODB_URI and ensure MongoDB is running.')
      console.error('   Refusing to start with in-memory store in production.\n')
      process.exit(1)
    }
    mode = 'memory'
    console.warn(`MongoDB unreachable (${err.message}). Running with an in-memory store - set MONGODB_URI for persistence.`)
  }
}
