import mongoose from 'mongoose';

// MongoDB connection
let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Legacy exports (unused but kept for backward compatibility during migration)
export function getSitePrefix(siteId: number): string {
  return `site_${siteId}_`;
}

export function getSiteTable(siteId: number, tableName: string): string {
  return `${getSitePrefix(siteId)}${tableName}`;
}

export function getSiteTableSafe(siteId: number, tableName: string): string {
  return `\`${getSitePrefix(siteId)}${tableName}\``;
}

const db = {
  async query<T = any>(_sql: string, _params?: any): Promise<[T, any]> {
    return [[] as any, null];
  },
  async execute<T = any>(_sql: string, _params?: any): Promise<[T, any]> {
    return [[] as any, null];
  }
};

export default db;
