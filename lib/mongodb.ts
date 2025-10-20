import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MONGODB_URI to .env file');
}

const MONGODB_URI: string = process.env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB
 * Uses cached connection to avoid creating multiple connections
 */
async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

/**
 * Get collection name with site prefix for multi-site support
 * @param siteId - Site ID
 * @param collection - Base collection name
 * @returns Collection name with site prefix
 */
export function getSiteCollection(siteId: number, collection: string): string {
  return `site_${siteId}_${collection}`;
}

/**
 * Disconnect from MongoDB (useful for testing)
 */
export async function disconnectDB(): Promise<void> {
  if (cached?.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('❌ MongoDB disconnected');
  }
}

export default connectDB;

