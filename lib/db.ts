import mysql from 'mysql2/promise';

// No connection pool - create/close connection for each query
// This is necessary for shared hosting with very strict max_user_connections limits

// Check if MySQL is configured (for backward compatibility with existing installations)
const isMySQLConfigured = !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

const dbConfig = isMySQLConfigured ? {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nextcms',
  charset: 'utf8mb4',
} : null;

// Wrapper that creates a connection, runs the query, and closes it
const db = {
  async query<T = any>(sql: string, params?: any): Promise<[T, any]> {
    if (!isMySQLConfigured || !dbConfig) {
      return [[] as any, null];
    }
    const connection = await mysql.createConnection(dbConfig);
    try {
      const result = await connection.query(sql, params);
      return result as [T, any];
    } finally {
      await connection.end();
    }
  },
  
  async execute<T = any>(sql: string, params?: any): Promise<[T, any]> {
    if (!isMySQLConfigured || !dbConfig) {
      return [[] as any, null];
    }
    const connection = await mysql.createConnection(dbConfig);
    try {
      const result = await connection.execute(sql, params);
      return result as [T, any];
    } finally {
      await connection.end();
    }
  }
};

// Multi-site helper functions
export function getSitePrefix(siteId: number): string {
  return `site_${siteId}_`;
}

export function getSiteTable(siteId: number, tableName: string): string {
  return `${getSitePrefix(siteId)}${tableName}`;
}

// Get table name with backticks for safe SQL (prevents SQL injection in table names)
export function getSiteTableSafe(siteId: number, tableName: string): string {
  return `\`${getSitePrefix(siteId)}${tableName}\``;
}

export default db;

