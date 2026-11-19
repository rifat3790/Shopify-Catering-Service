import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Shopify_Catering:ATxlhtQyol4o86Zr@cluster0.tma46bj.mongodb.net/shopify_catering?retryWrites=true&w=majority';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
let lastFailedAt = 0;
const RETRY_INTERVAL_MS = 60000; // Don't block requests if DB is known to be failing

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  // If connection failed within the last minute, fail fast (0ms) so APIs stay lightning fast
  if (Date.now() - lastFailedAt < RETRY_INTERVAL_MS) {
    return null;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 1500,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log('✅ Connected to MongoDB Atlas successfully.');
      lastFailedAt = 0;
      return m;
    }).catch((err) => {
      lastFailedAt = Date.now();
      console.warn('❌ MongoDB Connection failed (circuit-breaker active for 60s):', err.message);
      cached.promise = null;
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    lastFailedAt = Date.now();
    cached.promise = null;
    return null;
  }

  return cached.conn;
}

