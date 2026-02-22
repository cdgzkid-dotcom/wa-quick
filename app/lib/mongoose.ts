import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const cached = globalThis._mongooseConn ?? { conn: null, promise: null }
globalThis._mongooseConn = cached

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Define la variable MONGODB_URI en .env.local (o en Vercel → Settings → Environment Variables)')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false })
  }

  cached.conn = await cached.promise
  return cached.conn
}
