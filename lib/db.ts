import mysql from 'mysql2/promise';

// No connection pool - create/close connection for each query
// This is necessary for shared hosting with very strict max_user_connections limits

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nextcms',
  charset: 'utf8mb4',
};

// Wrapper that creates a connection, runs the query, and closes it
const db = {
  async query(sql: string, params?: any) {
    const connection = await mysql.createConnection(dbConfig);
    try {
      const result = await connection.query(sql, params);
      return result;
    } finally {
      await connection.end();
    }
  },
  
  async execute(sql: string, params?: any) {
    const connection = await mysql.createConnection(dbConfig);
    try {
      const result = await connection.execute(sql, params);
      return result;
    } finally {
      await connection.end();
    }
  }
};

export default db;

