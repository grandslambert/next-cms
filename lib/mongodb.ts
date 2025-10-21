import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MONGODB_URI to .env file');
}

const MONGODB_URI: string = process.env.MONGODB_URI;

/**
 * Parse the base MongoDB URI (without database name)
 */
function getBaseMongoURI(): string {
  // Remove database name from URI if present
  const uri = MONGODB_URI;
  const lastSlashIndex = uri.lastIndexOf('/');
  const hasQueryParams = uri.includes('?');
  
  if (lastSlashIndex > uri.indexOf('://') + 2) {
    if (hasQueryParams) {
      const queryStart = uri.indexOf('?');
      return uri.substring(0, lastSlashIndex) + uri.substring(queryStart);
    }
    return uri.substring(0, lastSlashIndex);
  }
  
  return uri;
}

/**
 * Build MongoDB URI for a specific database
 */
function buildDatabaseURI(dbName: string): string {
  const baseUri = getBaseMongoURI();
  const hasQueryParams = baseUri.includes('?');
  
  if (hasQueryParams) {
    const [base, query] = baseUri.split('?');
    return `${base}/${dbName}?${query}`;
  }
  
  return `${baseUri}/${dbName}`;
}

/**
 * Connection cache for multiple databases
 */
interface DatabaseConnections {
  [dbName: string]: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var mongoConnections: DatabaseConnections | undefined;
}

let connections = global.mongoConnections;

if (!connections) {
  connections = global.mongoConnections = {};
}

/**
 * Connect to a specific MongoDB database
 * Uses cached connections to avoid creating multiple connections
 */
async function connectToDatabase(dbName: string): Promise<mongoose.Connection> {
  if (!connections![dbName]) {
    connections![dbName] = { conn: null, promise: null };
  }

  const cached = connections![dbName];

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = buildDatabaseURI(dbName);
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.createConnection(uri, opts).asPromise().then((connection) => {
      console.log(`✅ MongoDB connected to database: ${dbName}`);
      return connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Connect to the global database (users, roles, sites, site_users)
 */
export async function connectToGlobalDB(): Promise<mongoose.Connection> {
  return connectToDatabase('nextcms_global');
}

/**
 * Connect to a site-specific database
 */
export async function connectToSiteDB(siteId: number | string): Promise<mongoose.Connection> {
  const dbName = `nextcms_site${siteId}`;
  return connectToDatabase(dbName);
}

/**
 * Get the database name for a site
 */
export function getSiteDatabaseName(siteId: number | string): string {
  return `nextcms_site${siteId}`;
}

/**
 * Legacy function - Connect to default database
 * For backwards compatibility during migration
 */
async function connectDB(): Promise<typeof mongoose> {
  // Connect to global database as default
  await connectToGlobalDB();
  return mongoose;
}

/**
 * Disconnect from all MongoDB databases (useful for testing)
 */
export async function disconnectDB(): Promise<void> {
  if (connections) {
    const dbNames = Object.keys(connections);
    await Promise.all(
      dbNames.map(async (dbName) => {
        const cached = connections![dbName];
        if (cached.conn) {
          await cached.conn.close();
          cached.conn = null;
          cached.promise = null;
          console.log(`❌ MongoDB disconnected from: ${dbName}`);
        }
      })
    );
  }
}

/**
 * Get all active database connections
 */
export function getActiveConnections(): string[] {
  if (!connections) return [];
  return Object.keys(connections).filter(dbName => connections![dbName].conn !== null);
}

export default connectDB;

