// This module should only be used server-side
import { v4 as uuidv4 } from 'uuid'

// Dynamic imports for server-side only modules
let mysql: any = null
let pool: any = null

// Initialize MySQL only on server-side
if (typeof window === 'undefined') {
  mysql = require('mysql2/promise')
  
  // Database connection configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tamanedu',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }

  // Create connection pool
  pool = mysql.createPool(dbConfig)
}

// Database query result interfaces
export interface QueryResult<T = any> {
  data?: T
  error?: string
}

export interface QueryResults<T = any> {
  data?: T[]
  error?: string
}

// Execute a query that returns multiple rows
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<QueryResults<T>> {
  // Only run on server-side
  if (typeof window !== 'undefined' || !pool) {
    return { error: 'Database operations only available on server-side' }
  }
  
  // Check database connection first
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
  } catch (error: any) {
    console.warn('⚠️  MySQL is not available. Please install and start MySQL for full functionality.')
    return { error: 'Database not available' }
  }
  
  try {
    const [rows] = await pool.execute(query, params)
    return { data: rows as T[] }
  } catch (error: any) {
    console.error('Database query error:', error)
    
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.warn('⚠️  MySQL is not available. Please install and start MySQL for full functionality.')
      return { error: 'Database not available' }
    }
    
    return { error: error.message }
  }
}

// Execute a query that returns a single row
export async function executeQuerySingle<T = any>(
  query: string, 
  params: any[] = []
): Promise<QueryResult<T>> {
  // Only run on server-side
  if (typeof window !== 'undefined' || !pool) {
    return { error: 'Database operations only available on server-side' }
  }
  
  // Check database connection first
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
  } catch (error: any) {
    console.warn('⚠️  MySQL is not available. Please install and start MySQL for full functionality.')
    return { error: 'Database not available' }
  }
  
  try {
    const [rows] = await pool.execute(query, params)
    const rowsArray = rows as T[]
    return { data: rowsArray.length > 0 ? rowsArray[0] : null }
  } catch (error: any) {
    console.error('Database query error:', error)
    
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.warn('⚠️  MySQL is not available. Please install and start MySQL for full functionality.')
      return { error: 'Database not available' }
    }
    
    return { error: error.message }
  }
}

// Generate a unique ID
export function generateId(): string {
  return uuidv4()
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  // Only run on server-side
  if (typeof window !== 'undefined' || !pool) {
    return false
  }
  
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// Close all connections (useful for testing)
export async function closeConnections(): Promise<void> {
  if (typeof window === 'undefined' && pool) {
    await pool.end()
  }
}

// Transaction helper
export async function executeTransaction<T>(
  operations: (connection: any) => Promise<T>
): Promise<QueryResult<T>> {
  // Only run on server-side
  if (typeof window !== 'undefined' || !pool) {
    return { error: 'Database operations only available on server-side' }
  }
  
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    const result = await operations(connection)
    await connection.commit()
    return { data: result }
  } catch (error: any) {
    await connection.rollback()
    console.error('Transaction error:', error)
    return { error: error.message }
  } finally {
    connection.release()
  }
}

export default pool
