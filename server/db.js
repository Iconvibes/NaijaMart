import mongoose from 'mongoose'

let mode = 'memory'

// The API runs fully in memory when MongoDB is not reachable, so the demo
// works anywhere. Set MONGODB_URI to a real database for persistence.
export const isMemoryDb = () => mode === 'memory'

export async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naijamart'
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 })
    mode = 'mongo'
    console.log(`MongoDB connected: ${uri}`)
  } catch (err) {
    mode = 'memory'
    console.warn(`MongoDB unreachable (${err.message}). Running with an in-memory store - set MONGODB_URI for persistence.`)
  }
}
